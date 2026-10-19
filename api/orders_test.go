package main

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
)

// The schema is the last line of defence for money rules, so test it directly.
func TestPreorderConstraints(t *testing.T) {
	ctx := context.Background()
	var uid, pid string
	if err := testDB.QueryRow(ctx, `insert into users (email, full_name, password_hash)
		values ('constraints@test.local', 'C', 'x') returning id`).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		testDB.Exec(ctx, "delete from preorders where user_id = $1", uid)
		testDB.Exec(ctx, "delete from users where id = $1", uid)
	})
	if err := testDB.QueryRow(ctx, "select id from products where slug = 'set-rimba'").Scan(&pid); err != nil {
		t.Fatal(err)
	}

	insert := func(code string, qty, unique, total int, status string) error {
		_, err := testDB.Exec(ctx, `insert into preorders (user_id, order_code, product_id, unit_price_idr, quantity,
			unique_code, total_idr, recipient_name, phone, address_text, status)
			values ($1, $2, $3, 900000, $4, $5, $6, 'R', '628123', 'Jl. Test', $7)`, uid, code, pid, qty, unique, total, status)
		return err
	}
	sqlState := func(err error) string {
		if pe, ok := errors.AsType[*pgconn.PgError](err); ok {
			return pe.Code
		}
		return ""
	}

	// Unit price far above real prices so they never clash with other tests' open orders.
	if err := insert("T-1", 1, 7, 900007, "pending_payment"); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name, code         string
		qty, unique, total int
		status, wantState  string
	}{
		{"same open total", "T-2", 1, 7, 900007, "pending_payment", "23505"},
		{"same order code", "T-1", 1, 8, 900008, "pending_payment", "23505"},
		{"wrong total", "T-3", 1, 9, 900000, "pending_payment", "23514"},
		{"qty over 100", "T-4", 101, 1, 90900001, "pending_payment", "23514"},
		{"unique code 0", "T-5", 1, 0, 900000, "pending_payment", "23514"},
	}
	for _, c := range cases {
		if got := sqlState(insert(c.code, c.qty, c.unique, c.total, c.status)); got != c.wantState {
			t.Errorf("%s: sqlstate %q, want %q", c.name, got, c.wantState)
		}
	}
	// A closed order frees its amount for reuse.
	if err := insert("T-6", 1, 7, 900007, "cancelled"); err != nil {
		t.Errorf("cancelled order with an open order's total: %v", err)
	}
}

// Tests share the dev DB: keep any real payment settings and drop test orders.
func isolateOrders(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	var saved []byte
	_ = testDB.QueryRow(ctx, "select body from cms_contents where section_key = 'payment'").Scan(&saved)
	testDB.Exec(ctx, "delete from cms_contents where section_key = 'payment'")
	t.Cleanup(func() {
		testDB.Exec(ctx, "delete from preorders where user_id in (select id from users where email like '%@test.id')")
		testDB.Exec(ctx, "delete from cms_contents where section_key = 'payment'")
		if saved != nil {
			testDB.Exec(ctx, "insert into cms_contents (section_key, body) values ('payment', $1)", saved)
		}
	})
}

// signs up a user, makes them manager, and logs in again so the JWT carries the role.
func manager(t *testing.T, app *fiber.App) resp {
	t.Helper()
	email := newEmail()
	signup(t, app, email, "rahasia123")
	testDB.Exec(context.Background(), "update users set role = 'manager' where email = $1", email)
	return call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": email, "password": "rahasia123"})
}

func validOrder() fiber.Map {
	return fiber.Map{"product_slug": "set-rimba", "quantity": 2, "recipient_name": "Bu Siti",
		"phone": "0812-3456-7890", "address_text": "Jl. Melati No. 5, RT 02/RW 03, Surakarta"}
}

func TestPreorderFlow(t *testing.T) {
	isolateOrders(t)
	app := newApp(testDB, "")
	buyer := withCookies(signup(t, app, newEmail(), "rahasia123").cookies)

	if r := call(t, app, "POST", "/api/v1/preorders", validOrder()); r.code != 401 {
		t.Fatalf("logged out: want 401, got %d", r.code)
	}
	in := validOrder()
	in["unit_price_idr"], in["total_idr"] = 1, 1 // must be ignored
	r := call(t, app, "POST", "/api/v1/preorders", in, buyer)
	if r.code != 201 {
		t.Fatalf("create: %d %v", r.code, r.body)
	}
	o := r.body["data"].(map[string]any)
	price, unique := o["unit_price_idr"].(float64), o["unique_code"].(float64)
	if price != 250000 || unique < 1 || unique > 999 || o["total_idr"].(float64) != price*2+unique {
		t.Fatalf("pricing: %v", o)
	}
	if !regexp.MustCompile(`^BUMI-\d{4}-[A-Z2-7]{5}$`).MatchString(o["order_code"].(string)) || o["phone"] != "6281234567890" {
		t.Fatalf("code/phone: %v", o)
	}
	if o["payment"] != nil || o["whatsapp_url"] != nil {
		t.Fatalf("no settings yet, want payment and whatsapp_url null: %v", o)
	}
	id := o["id"].(string)

	for name, mod := range map[string]func(fiber.Map){
		"qty 0":        func(m fiber.Map) { m["quantity"] = 0 },
		"qty 101":      func(m fiber.Map) { m["quantity"] = 101 },
		"no name":      func(m fiber.Map) { m["recipient_name"] = " " },
		"bad phone":    func(m fiber.Map) { m["phone"] = "12345" },
		"short addr":   func(m fiber.Map) { m["address_text"] = "Solo" },
		"lat only":     func(m fiber.Map) { m["lat"] = -7.56 },
		"lat range":    func(m fiber.Map) { m["lat"], m["lng"] = 91.0, 110.0 },
		"unknown slug": func(m fiber.Map) { m["product_slug"] = "nope" },
	} {
		m := validOrder()
		mod(m)
		if r := call(t, app, "POST", "/api/v1/preorders", m, buyer); r.code != 400 && r.code != 404 {
			t.Errorf("%s: want 400/404, got %d", name, r.code)
		}
	}
	m := validOrder()
	m["lat"], m["lng"], m["place_id"] = -7.5666, 110.8166, "N123"
	if r := call(t, app, "POST", "/api/v1/preorders", m, buyer); r.code != 201 || r.body["data"].(map[string]any)["lat"] != -7.5666 {
		t.Fatalf("with pin: %d %v", r.code, r.body)
	}

	if r := call(t, app, "GET", "/api/v1/preorders/"+id, nil, buyer); r.code != 200 {
		t.Fatalf("owner get: %d", r.code)
	}
	other := withCookies(signup(t, app, newEmail(), "rahasia123").cookies)
	for name, path := range map[string]string{"other user": id, "bad id": "abc"} {
		if r := call(t, app, "GET", "/api/v1/preorders/"+path, nil, other); r.code != 404 {
			t.Errorf("%s: want 404, got %d", name, r.code)
		}
	}

	if r := call(t, app, "GET", "/api/v1/admin/settings/payment", nil, buyer); r.code != 403 {
		t.Fatalf("customer settings: want 403, got %d", r.code)
	}
	mgr := withCookies(manager(t, app).cookies)
	settings := fiber.Map{"bank_name": "BCA", "account_number": "123 456 7890", "account_holder": "PT Bumilogi", "whatsapp": "+62 811-2233-4455"}
	if r := call(t, app, "PUT", "/api/v1/admin/settings/payment", fiber.Map{"bank_name": "BCA", "account_number": "12a", "account_holder": "X", "whatsapp": "0811223344"}, mgr); r.code != 400 {
		t.Fatalf("bad settings: want 400, got %d", r.code)
	}
	if r := call(t, app, "PUT", "/api/v1/admin/settings/payment", settings, mgr); r.code != 200 {
		t.Fatalf("save settings: %d %v", r.code, r.body)
	}
	if r := call(t, app, "GET", "/api/v1/admin/settings/payment", nil, mgr); r.body["data"].(map[string]any)["account_number"] != "1234567890" {
		t.Fatalf("get settings: %v", r.body)
	}

	r = call(t, app, "GET", "/api/v1/preorders/"+id, nil, buyer)
	o = r.body["data"].(map[string]any)
	wa, _ := o["whatsapp_url"].(string)
	if o["payment"].(map[string]any)["bank_name"] != "BCA" || !strings.HasPrefix(wa, "https://wa.me/6281122334455?text=") ||
		!strings.Contains(wa, o["order_code"].(string)) || strings.Contains(wa, "+") {
		t.Fatalf("payment/wa: %v", o)
	}
	if r := call(t, app, "GET", "/api/v1/preorders/"+id, nil, mgr); r.code != 200 {
		t.Fatalf("manager get: %d", r.code)
	}
}

func TestPreorderAmountCollision(t *testing.T) {
	isolateOrders(t)
	ctx := context.Background()
	// Own product, so real open orders in the dev DB can't occupy these amounts.
	testDB.Exec(ctx, "insert into products (slug, edition, name, price_idr) values ('test-collide', 'rimba', 'Collide', 777000)")
	t.Cleanup(func() {
		testDB.Exec(ctx, "delete from preorders where product_id = (select id from products where slug = 'test-collide')")
		testDB.Exec(ctx, "delete from products where slug = 'test-collide'")
	})
	orig := randUniqueCode
	t.Cleanup(func() { randUniqueCode = orig })
	seq := []int{5, 5, 6}
	randUniqueCode = func() int { n := seq[0]; seq = seq[1:]; return n }

	app := newApp(testDB, "")
	buyer := withCookies(signup(t, app, newEmail(), "rahasia123").cookies)
	in := validOrder()
	in["product_slug"], in["quantity"] = "test-collide", 1
	for _, want := range []float64{777005, 777006} {
		r := call(t, app, "POST", "/api/v1/preorders", in, buyer)
		if r.code != 201 || r.body["data"].(map[string]any)["total_idr"] != want {
			t.Fatalf("want total %v: %d %v", want, r.code, r.body)
		}
	}
	randUniqueCode = func() int { return 5 }
	if r := call(t, app, "POST", "/api/v1/preorders", in, buyer); r.code != 503 {
		t.Fatalf("exhausted retries: want 503, got %d", r.code)
	}
}
