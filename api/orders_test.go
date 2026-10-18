package main

import (
	"context"
	"errors"
	"testing"

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
