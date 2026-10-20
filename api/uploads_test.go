package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// upload posts data as the multipart "file" field from our own origin.
func upload(t *testing.T, app *fiber.App, id, filename string, data []byte, mod ...func(*http.Request)) resp {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, _ := w.CreateFormFile("file", filename)
	part.Write(data)
	w.Close()
	req, _ := http.NewRequest("POST", "/api/v1/preorders/"+id+"/payment-proof", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", appURL)
	for _, f := range mod {
		f(req)
	}
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	r := resp{code: res.StatusCode}
	_ = json.NewDecoder(res.Body).Decode(&r.body)
	return r
}

func download(t *testing.T, app *fiber.App, id string, mod ...func(*http.Request)) (*http.Response, []byte) {
	t.Helper()
	req, _ := http.NewRequest("GET", "/api/v1/preorders/"+id+"/payment-proof", nil)
	for _, f := range mod {
		f(req)
	}
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(res.Body)
	return res, b
}

func proofFiles(t *testing.T) []string {
	t.Helper()
	m, _ := filepath.Glob(filepath.Join(uploadDir, "private", "*"))
	return m
}

func TestPaymentProof(t *testing.T) {
	isolateOrders(t)
	uploadDir = t.TempDir()
	os.MkdirAll(filepath.Join(uploadDir, "private"), 0o750)
	app := newApp(testDB, "")
	buyer := withCookies(signup(t, app, newEmail(), "rahasia123").cookies)
	other := withCookies(signup(t, app, newEmail(), "rahasia123").cookies)
	id := call(t, app, "POST", "/api/v1/preorders", validOrder(), buyer).body["data"].(map[string]any)["id"].(string)

	png := append([]byte("\x89PNG\r\n\x1a\n"), bytes.Repeat([]byte{0}, 100)...)
	r := upload(t, app, id, "bukti.png", png, buyer)
	if r.code != 200 || r.body["data"].(map[string]any)["has_payment_proof"] != true {
		t.Fatalf("png upload: %d %v", r.code, r.body)
	}
	if strings.Contains(strings.Join(proofFiles(t), ""), "bukti") {
		t.Fatal("stored under the client's filename")
	}
	res, body := download(t, app, id, buyer)
	if res.StatusCode != 200 || !bytes.Equal(body, png) || res.Header.Get("Content-Type") != "image/png" {
		t.Fatalf("download: %d %q", res.StatusCode, res.Header.Get("Content-Type"))
	}
	for h, want := range map[string]string{"X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
		"Cache-Control": "private, no-store", "Content-Disposition": ""} {
		if got := res.Header.Get(h); got != want {
			t.Errorf("image header %s = %q, want %q", h, got, want)
		}
	}

	for name, c := range map[string]struct {
		filename string
		data     []byte
		want     int
	}{
		"html named .png":    {"evil.png", []byte("<html><script>alert(1)</script></html>"), 415},
		"exe named .jpg.exe": {"bukti.jpg.exe", append([]byte("MZ\x90\x00\x03\x00\x00\x00"), bytes.Repeat([]byte{0}, 100)...), 415},
		"svg":                {"bukti.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`), 415},
		"5.5 MB":             {"big.png", append(png, bytes.Repeat([]byte{0}, 11<<19)...), 413},
	} {
		if r := upload(t, app, id, c.filename, c.data, buyer); r.code != c.want {
			t.Errorf("%s: want %d, got %d %v", name, c.want, r.code, r.body)
		}
	}
	if n := len(proofFiles(t)); n != 1 {
		t.Fatalf("rejected uploads left files behind: %d files", n)
	}

	// Multipart without our Origin is the cross-site form case.
	if r := upload(t, app, id, "bukti.png", png, buyer, func(r *http.Request) { r.Header.Del("Origin") }); r.code != 415 {
		t.Errorf("no origin: want 415, got %d", r.code)
	}
	if r := upload(t, app, id, "bukti.png", png, buyer, func(r *http.Request) { r.Header.Set("Origin", "https://evil.example") }); r.code != 415 {
		t.Errorf("foreign origin: want 415, got %d", r.code)
	}

	// A real PDF named .jpg.pdf is stored as PDF, replaces the PNG, and downloads as an attachment.
	pdf := []byte("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF")
	if r := upload(t, app, id, "bukti.jpg.pdf", pdf, buyer); r.code != 200 {
		t.Fatalf("pdf upload: %d %v", r.code, r.body)
	}
	files := proofFiles(t)
	if len(files) != 1 || !strings.HasSuffix(files[0], ".pdf") {
		t.Fatalf("re-upload should replace the old file: %v", files)
	}
	res, body = download(t, app, id, buyer)
	if !bytes.Equal(body, pdf) || !strings.HasPrefix(res.Header.Get("Content-Disposition"), "attachment") ||
		res.Header.Get("Content-Security-Policy") != "sandbox" {
		t.Fatalf("pdf download: %v", res.Header)
	}

	if r := upload(t, app, id, "bukti.png", png, other); r.code != 404 {
		t.Errorf("other user upload: want 404, got %d", r.code)
	}
	if res, _ := download(t, app, id, other); res.StatusCode != 404 {
		t.Errorf("other user download: want 404, got %d", res.StatusCode)
	}
	if res, _ := download(t, app, id); res.StatusCode != 401 {
		t.Errorf("logged out download: want 401, got %d", res.StatusCode)
	}
	if res, _ := download(t, app, id, withCookies(manager(t, app).cookies)); res.StatusCode != 200 {
		t.Errorf("manager download: want 200, got %d", res.StatusCode)
	}
	noProof := call(t, app, "POST", "/api/v1/preorders", validOrder(), buyer).body["data"].(map[string]any)["id"].(string)
	if res, _ := download(t, app, noProof, buyer); res.StatusCode != 404 {
		t.Errorf("no proof yet: want 404, got %d", res.StatusCode)
	}

	testDB.Exec(context.Background(), "update preorders set status = 'confirmed' where id = $1", id)
	if r := upload(t, app, id, "bukti.png", png, buyer); r.code != 409 {
		t.Errorf("confirmed order: want 409, got %d", r.code)
	}
	if n := len(proofFiles(t)); n != 1 {
		t.Errorf("409 left a file behind: %d files", n)
	}
}
