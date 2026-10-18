package main

import (
	"context"
	"crypto/rand"
	"errors"
	"math"
	mrand "math/rand/v2"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type order struct {
	ID            string           `json:"id"`
	OrderCode     string           `json:"order_code"`
	ProductName   string           `json:"product_name"`
	ProductSlug   string           `json:"product_slug"`
	Edition       string           `json:"edition"`
	UnitPriceIDR  int              `json:"unit_price_idr"`
	Quantity      int              `json:"quantity"`
	UniqueCode    int              `json:"unique_code"`
	TotalIDR      int              `json:"total_idr"`
	RecipientName string           `json:"recipient_name"`
	Phone         string           `json:"phone"`
	AddressText   string           `json:"address_text"`
	Lat           *float64         `json:"lat"`
	Lng           *float64         `json:"lng"`
	PlaceID       *string          `json:"place_id"`
	Status        string           `json:"status"`
	CreatedAt     time.Time        `json:"created_at"`
	Payment       *paymentSettings `json:"payment"`      // nil until a manager sets it; the page hides the bank section
	WhatsAppURL   *string          `json:"whatsapp_url"` // wa.me link prefilled with code + total
}

// Overridden in tests to force amount collisions.
var randUniqueCode = func() int { return mrand.IntN(999) + 1 }

func orderRoutes(r fiber.Router, db *pgxpool.Pool) {
	limit := limiter.New(limiter.Config{Max: 20, Expiration: time.Minute, LimitReached: func(c *fiber.Ctx) error {
		return fail(c, fiber.StatusTooManyRequests, "Terlalu banyak pesanan. Coba lagi dalam satu menit.")
	}})
	r.Post("/preorders", limit, requireAuth, createPreorder(db))
	r.Get("/preorders/:id", requireAuth, func(c *fiber.Ctx) error {
		o, err := loadOrder(c.Context(), db, c.Params("id"), c.Locals("uid").(string), c.Locals("role") == "manager")
		if err != nil {
			return err
		}
		return ok(c, o)
	})
}

func createPreorder(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// No price or total fields: the server prices the order.
		var in struct {
			ProductSlug   string   `json:"product_slug"`
			Quantity      int      `json:"quantity"`
			RecipientName string   `json:"recipient_name"`
			Phone         string   `json:"phone"`
			AddressText   string   `json:"address_text"`
			Lat           *float64 `json:"lat"`
			Lng           *float64 `json:"lng"`
			PlaceID       string   `json:"place_id"`
		}
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		in.RecipientName, in.AddressText, in.PlaceID = strings.TrimSpace(in.RecipientName), strings.TrimSpace(in.AddressText), strings.TrimSpace(in.PlaceID)
		phone, okPhone := normalizePhone(in.Phone)
		switch {
		case in.Quantity < 1 || in.Quantity > 100:
			return fiber.NewError(fiber.StatusBadRequest, "Jumlah set harus 1–100")
		case in.RecipientName == "" || len(in.RecipientName) > 100:
			return fiber.NewError(fiber.StatusBadRequest, "Nama penerima wajib diisi (maks. 100 karakter)")
		case !okPhone:
			return fiber.NewError(fiber.StatusBadRequest, "Nomor WhatsApp tidak valid (contoh: 0812 3456 7890)")
		case len(in.AddressText) < 10 || len(in.AddressText) > 1000:
			return fiber.NewError(fiber.StatusBadRequest, "Alamat lengkap wajib diisi (min. 10 karakter)")
		case (in.Lat == nil) != (in.Lng == nil) || in.Lat != nil && (math.Abs(*in.Lat) > 90 || math.Abs(*in.Lng) > 180):
			return fiber.NewError(fiber.StatusBadRequest, "Titik peta tidak valid")
		case len(in.PlaceID) > 300:
			return fiber.NewError(fiber.StatusBadRequest, "Titik peta tidak valid")
		}

		var productID string
		var price int
		err := db.QueryRow(c.Context(), "select id, price_idr from products where slug = $1 and is_active", in.ProductSlug).Scan(&productID, &price)
		if errors.Is(err, pgx.ErrNoRows) {
			return fail(c, fiber.StatusNotFound, "Produk tidak ditemukan")
		}
		if err != nil {
			return err
		}

		// A unique violation means the order code or the open transfer amount is
		// taken; pick new ones and retry.
		// ponytail: random retry; if ~all 999 amounts for one subtotal are open at
		// once this gives up. Scan for a free code in SQL if that ever happens.
		subtotal := price * in.Quantity
		var id string
		for range 10 {
			unique := randUniqueCode()
			err = db.QueryRow(c.Context(), `insert into preorders (user_id, order_code, product_id, unit_price_idr, quantity,
				unique_code, total_idr, recipient_name, phone, address_text, lat, lng, place_id)
				values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, nullif($13, '')) returning id`,
				c.Locals("uid"), "BUMI-"+strconv.Itoa(time.Now().Year())+"-"+rand.Text()[:5], productID, price, in.Quantity,
				unique, subtotal+unique, in.RecipientName, phone, in.AddressText, in.Lat, in.Lng, in.PlaceID).Scan(&id)
			if pe, isPg := errors.AsType[*pgconn.PgError](err); !isPg || pe.Code != "23505" {
				break
			}
		}
		if err != nil {
			if pe, isPg := errors.AsType[*pgconn.PgError](err); isPg && pe.Code == "23505" {
				return fail(c, fiber.StatusServiceUnavailable, "Sistem sedang sibuk, coba lagi sebentar")
			}
			return err
		}
		o, err := loadOrder(c.Context(), db, id, "", true)
		if err != nil {
			return err
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"status": "success", "data": o})
	}
}

// loadOrder returns the order if uid owns it or asManager is set. Anything else,
// including a malformed id, is a 404 so ids can't be probed.
func loadOrder(ctx context.Context, db *pgxpool.Pool, id, uid string, asManager bool) (*order, error) {
	notFound := fiber.NewError(fiber.StatusNotFound, "Pesanan tidak ditemukan")
	if uuid.Validate(id) != nil {
		return nil, notFound
	}
	var o order
	err := db.QueryRow(ctx, `select p.id, p.order_code, pr.name, pr.slug, pr.edition, p.unit_price_idr, p.quantity,
		p.unique_code, p.total_idr, p.recipient_name, p.phone, p.address_text, p.lat, p.lng, p.place_id, p.status, p.created_at
		from preorders p join products pr on pr.id = p.product_id
		where p.id = $1 and (p.user_id::text = $2 or $3)`, id, uid, asManager).Scan(
		&o.ID, &o.OrderCode, &o.ProductName, &o.ProductSlug, &o.Edition, &o.UnitPriceIDR, &o.Quantity,
		&o.UniqueCode, &o.TotalIDR, &o.RecipientName, &o.Phone, &o.AddressText, &o.Lat, &o.Lng, &o.PlaceID, &o.Status, &o.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound
	}
	if err != nil {
		return nil, err
	}
	if o.Payment, err = loadPayment(ctx, db); err != nil {
		return nil, err
	}
	if o.Payment != nil {
		msg := "Halo Admin BUMILOGI, saya sudah memesan " + o.ProductName + " × " + strconv.Itoa(o.Quantity) +
			". Kode pesanan " + o.OrderCode + ", total transfer " + formatIDR(o.TotalIDR) + "."
		wa := "https://wa.me/" + o.Payment.WhatsApp + "?text=" + strings.ReplaceAll(url.QueryEscape(msg), "+", "%20")
		o.WhatsAppURL = &wa
	}
	return &o, nil
}

// normalizePhone turns Indonesian numbers like "0812-3456 7890" or
// "+62 812…" into wa.me form "62812…".
func normalizePhone(s string) (string, bool) {
	s = strings.NewReplacer(" ", "", "-", "", "(", "", ")", "", ".", "").Replace(strings.TrimSpace(s))
	s = strings.TrimPrefix(s, "+")
	if strings.HasPrefix(s, "0") {
		s = "62" + s[1:]
	}
	if !strings.HasPrefix(s, "628") || len(s) < 10 || len(s) > 15 || strings.Trim(s, "0123456789") != "" {
		return "", false
	}
	return s, true
}

// formatIDR: 250347 → "Rp 250.347", matching the web's formatIDR.
func formatIDR(n int) string {
	s := strconv.Itoa(n)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "." + s[i:]
	}
	return "Rp " + s
}
