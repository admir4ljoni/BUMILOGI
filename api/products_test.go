package main

import (
	"context"
	"testing"
)

func TestProducts(t *testing.T) {
	app := newApp(testDB, "")
	ctx := context.Background()
	if _, err := testDB.Exec(ctx, `insert into products (slug, edition, name, price_idr, is_active)
		values ('test-hidden', 'rimba', 'Hidden', 1000, false) on conflict (slug) do nothing`); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { testDB.Exec(ctx, "delete from products where slug = 'test-hidden'") })

	r := call(t, app, "GET", "/api/v1/products", nil)
	if r.code != 200 {
		t.Fatalf("list: %d %v", r.code, r.body)
	}
	slugs := map[string]bool{}
	for _, p := range r.body["data"].([]any) {
		slugs[p.(map[string]any)["slug"].(string)] = true
	}
	if !slugs["set-rimba"] || !slugs["set-samudra"] || slugs["test-hidden"] {
		t.Fatalf("list slugs = %v", slugs)
	}

	r = call(t, app, "GET", "/api/v1/products/set-rimba", nil)
	if p, _ := r.body["data"].(map[string]any); r.code != 200 || p["price_idr"].(float64) <= 0 || len(p["contents"].([]any)) == 0 {
		t.Fatalf("detail: %d %v", r.code, r.body)
	}
	for _, slug := range []string{"nope", "test-hidden"} {
		if r = call(t, app, "GET", "/api/v1/products/"+slug, nil); r.code != 404 {
			t.Fatalf("%s: want 404, got %d", slug, r.code)
		}
	}
}
