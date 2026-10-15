package main

import (
	"context"
	"errors"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// set at build time: -ldflags "-X main.version=<sha>"
var version = "dev"

func main() {
	jwtKey = []byte(mustEnv("JWT_SECRET"))
	appURL = strings.TrimRight(mustEnv("APP_URL"), "/")
	db, err := openDB(context.Background(), mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(newApp(db, os.Getenv("TRUSTED_PROXIES")).Listen(":" + port))
}

// trustedProxies: comma-separated IPs/CIDRs (the Nginx container network) whose
// X-Real-IP header is believed. Empty = trust nobody, use the socket address.
func newApp(db *pgxpool.Pool, trustedProxies string) *fiber.App {
	var proxies []string
	if trustedProxies != "" {
		proxies = strings.Split(trustedProxies, ",")
	}
	app := fiber.New(fiber.Config{
		ProxyHeader:             "X-Real-IP",
		EnableTrustedProxyCheck: true,
		TrustedProxies:          proxies,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			var fe *fiber.Error
			if errors.As(err, &fe) {
				code = fe.Code
			} else {
				log.Printf("%s %s: %v", c.Method(), c.Path(), err)
			}
			msg := "Terjadi kesalahan pada server"
			if code < 500 {
				msg = err.Error()
			}
			return fail(c, code, msg)
		},
	})
	v1 := app.Group("/api/v1")
	v1.Get("/health", func(c *fiber.Ctx) error {
		if err := db.Ping(c.Context()); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "error", "data": fiber.Map{"db": err.Error()}})
		}
		return ok(c, fiber.Map{"version": version})
	})
	authRoutes(v1, db)
	return app
}

func ok(c *fiber.Ctx, data any) error {
	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func fail(c *fiber.Ctx, code int, msg string) error {
	return c.Status(code).JSON(fiber.Map{"status": "error", "message": msg})
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing env %s", k)
	}
	return v
}
