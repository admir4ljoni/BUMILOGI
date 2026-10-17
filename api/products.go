package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type product struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Edition     string   `json:"edition"`
	Name        string   `json:"name"`
	Tagline     string   `json:"tagline"`
	Description string   `json:"description"`
	Contents    []string `json:"contents"`
	Animals     []string `json:"animals"`
	PriceIDR    int      `json:"price_idr"`
	ImageURL    *string  `json:"image_url"`
}

const productCols = "id, slug, edition, name, tagline, description, contents, animals, price_idr, image_url"

// Public catalog: inactive products are invisible, as if they didn't exist.
func productRoutes(r fiber.Router, db *pgxpool.Pool) {
	r.Get("/products", func(c *fiber.Ctx) error {
		rows, _ := db.Query(c.Context(), "select "+productCols+" from products where is_active order by edition desc, name")
		ps, err := pgx.CollectRows(rows, pgx.RowToStructByPos[product])
		if err != nil {
			return err
		}
		return ok(c, ps)
	})
	r.Get("/products/:slug", func(c *fiber.Ctx) error {
		rows, _ := db.Query(c.Context(), "select "+productCols+" from products where slug = $1 and is_active", c.Params("slug"))
		p, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByPos[product])
		if err == pgx.ErrNoRows {
			return fail(c, fiber.StatusNotFound, "Produk tidak ditemukan")
		}
		if err != nil {
			return err
		}
		return ok(c, p)
	})
}
