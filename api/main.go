package main

import (
	"context"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
)

// set at build time: -ldflags "-X main.version=<sha>"
var version = "dev"

func main() {
	db, err := openDB(context.Background(), mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	app := fiber.New()
	v1 := app.Group("/api/v1")
	v1.Get("/health", func(c *fiber.Ctx) error {
		if err := db.Ping(c.Context()); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "error", "data": fiber.Map{"db": err.Error()}})
		}
		return c.JSON(fiber.Map{"status": "success", "data": fiber.Map{"version": version}})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen(":" + port))
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing env %s", k)
	}
	return v
}
