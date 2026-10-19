package main

import (
	"context"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Stored as cms_contents section 'payment', edited on /admin/pengaturan.
type paymentSettings struct {
	BankName      string `json:"bank_name"`
	AccountNumber string `json:"account_number"`
	AccountHolder string `json:"account_holder"`
	WhatsApp      string `json:"whatsapp"` // wa.me form, 62…
}

func settingsRoutes(r fiber.Router, db *pgxpool.Pool) {
	a := r.Group("/admin", requireAuth, requireRole("manager"))
	a.Get("/settings/payment", func(c *fiber.Ctx) error {
		p, err := loadPayment(c.Context(), db)
		if err != nil {
			return err
		}
		return ok(c, p)
	})
	a.Put("/settings/payment", func(c *fiber.Ctx) error {
		var in paymentSettings
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		in.BankName, in.AccountHolder = strings.TrimSpace(in.BankName), strings.TrimSpace(in.AccountHolder)
		in.AccountNumber = strings.NewReplacer(" ", "", "-", "", ".", "").Replace(in.AccountNumber)
		wa, okWA := normalizePhone(in.WhatsApp)
		switch {
		case in.BankName == "" || len(in.BankName) > 50:
			return fiber.NewError(fiber.StatusBadRequest, "Nama bank wajib diisi (maks. 50 karakter)")
		case len(in.AccountNumber) < 5 || len(in.AccountNumber) > 20 || strings.Trim(in.AccountNumber, "0123456789") != "":
			return fiber.NewError(fiber.StatusBadRequest, "Nomor rekening harus 5–20 angka")
		case in.AccountHolder == "" || len(in.AccountHolder) > 100:
			return fiber.NewError(fiber.StatusBadRequest, "Nama pemilik rekening wajib diisi (maks. 100 karakter)")
		case !okWA:
			return fiber.NewError(fiber.StatusBadRequest, "Nomor WhatsApp admin tidak valid (contoh: 0812 3456 7890)")
		}
		in.WhatsApp = wa
		_, err := db.Exec(c.Context(), `insert into cms_contents (section_key, body, updated_by) values ('payment', $1, $2)
			on conflict (section_key) do update set body = excluded.body, updated_by = excluded.updated_by, updated_at = now()`,
			in, c.Locals("uid"))
		if err != nil {
			return err
		}
		return ok(c, in)
	})
}

// loadPayment returns nil until a manager has saved the settings.
func loadPayment(ctx context.Context, db *pgxpool.Pool) (*paymentSettings, error) {
	var p paymentSettings
	err := db.QueryRow(ctx, "select body from cms_contents where section_key = 'payment'").Scan(&p)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}
