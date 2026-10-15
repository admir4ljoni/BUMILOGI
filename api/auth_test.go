package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	testDB *pgxpool.Pool
	mails  = make(chan string, 10)
)

func TestMain(m *testing.M) {
	var err error
	testDB, err = openDB(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Println("tests need Postgres and DATABASE_URL:", err)
		os.Exit(1)
	}
	jwtKey = []byte("test-secret")
	appURL = "http://localhost:3000"
	sendMail = func(to, subject, body string) { mails <- body }
	os.Exit(m.Run())
}

type resp struct {
	code    int
	body    map[string]any
	cookies []*http.Cookie
}

func call(t *testing.T, app *fiber.App, method, path string, body any, mod ...func(*http.Request)) resp {
	t.Helper()
	b, _ := json.Marshal(body)
	if raw, ok := body.(string); ok {
		b = []byte(raw) // sent verbatim, for non-JSON bodies
	}
	req, _ := http.NewRequest(method, path, strings.NewReader(string(b)))
	req.Header.Set("Content-Type", "application/json")
	for _, f := range mod {
		f(req)
	}
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	var out map[string]any
	_ = json.NewDecoder(res.Body).Decode(&out)
	return resp{res.StatusCode, out, res.Cookies()}
}

func withCookies(cs []*http.Cookie) func(*http.Request) {
	return func(r *http.Request) {
		for _, c := range cs {
			r.AddCookie(c)
		}
	}
}

func cookie(r resp, name string) *http.Cookie {
	for _, c := range r.cookies {
		if c.Name == name {
			return c
		}
	}
	return nil
}

var tokenRe = regexp.MustCompile(`token=([A-Za-z0-9_-]+)`)

func nextMailToken(t *testing.T) string {
	t.Helper()
	select {
	case body := <-mails:
		return tokenRe.FindStringSubmatch(body)[1]
	case <-time.After(2 * time.Second):
		t.Fatal("no mail sent")
		return ""
	}
}

func noMail(t *testing.T) {
	t.Helper()
	select {
	case <-mails:
		t.Fatal("unexpected mail")
	case <-time.After(200 * time.Millisecond):
	}
}

func newEmail() string { return fmt.Sprintf("t%d@test.id", time.Now().UnixNano()) }

// register + verify, returns the verify response (logged in).
func signup(t *testing.T, app *fiber.App, email, pw string) resp {
	t.Helper()
	if r := call(t, app, "POST", "/api/v1/auth/register", fiber.Map{"full_name": "Siti", "email": email, "password": pw}); r.code != 202 {
		t.Fatalf("register: %d %v", r.code, r.body)
	}
	r := call(t, app, "POST", "/api/v1/auth/verify-email", fiber.Map{"token": nextMailToken(t)})
	if r.code != 200 {
		t.Fatalf("verify: %d %v", r.code, r.body)
	}
	return r
}

func TestEmailAuthFlow(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()

	call(t, app, "POST", "/api/v1/auth/register", fiber.Map{"full_name": "Siti", "email": email, "password": "rahasia123"})
	token := nextMailToken(t)
	if r := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": email, "password": "rahasia123"}); r.code != 403 {
		t.Fatalf("unverified login: want 403, got %d", r.code)
	}
	v := call(t, app, "POST", "/api/v1/auth/verify-email", fiber.Map{"token": token})
	if v.code != 200 || cookie(v, "access_token") == nil || !cookie(v, "access_token").HttpOnly {
		t.Fatalf("verify: %d %v", v.code, v.cookies)
	}
	if r := call(t, app, "POST", "/api/v1/auth/verify-email", fiber.Map{"token": token}); r.code != 400 {
		t.Fatalf("token reuse: want 400, got %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": email, "password": "salah12345"}); r.code != 401 {
		t.Fatalf("wrong password: want 401, got %d", r.code)
	}
	l := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": strings.ToUpper(email), "password": "rahasia123"})
	if l.code != 200 {
		t.Fatalf("login: %d %v", l.code, l.body)
	}
	m := call(t, app, "GET", "/api/v1/auth/me", nil, withCookies(l.cookies))
	if m.code != 200 || m.body["data"].(map[string]any)["email"] != email {
		t.Fatalf("me: %d %v", m.code, m.body)
	}
	if r := call(t, app, "GET", "/api/v1/auth/me", nil); r.code != 401 {
		t.Fatalf("me logged out: want 401, got %d", r.code)
	}
	access := l.body["data"].(map[string]any)["tokens"].(map[string]any)["access_token"].(string)
	if r := call(t, app, "GET", "/api/v1/auth/me", nil, func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+access) }); r.code != 200 {
		t.Fatalf("bearer me: %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/refresh", fiber.Map{"refresh_token": access}); r.code != 401 {
		t.Fatalf("access token used as refresh: want 401, got %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/refresh", nil, withCookies(l.cookies)); r.code != 200 || cookie(r, "access_token") == nil {
		t.Fatalf("refresh: %d", r.code)
	}
}

// A cross-site HTML form can't send JSON, so non-JSON bodies must be refused
// before they can log a victim's browser into the attacker's account.
func TestFormPostRejected(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()
	signup(t, app, email, "rahasia123")
	form := "Email=" + email + "&Password=rahasia123"
	multipart := "--x\r\nContent-Disposition: form-data; name=\"Email\"\r\n\r\n" + email +
		"\r\n--x\r\nContent-Disposition: form-data; name=\"Password\"\r\n\r\nrahasia123\r\n--x--\r\n"
	for ct, body := range map[string]string{
		"application/x-www-form-urlencoded": form, "multipart/form-data; boundary=x": multipart, "text/plain": form,
	} {
		r := call(t, app, "POST", "/api/v1/auth/login", body, func(r *http.Request) { r.Header.Set("Content-Type", ct) })
		if r.code != 415 || len(r.cookies) != 0 {
			t.Fatalf("%s login: want 415 and no cookies, got %d %v", ct, r.code, r.cookies)
		}
	}
	if r := call(t, app, "POST", "/api/v1/auth/logout", "", func(r *http.Request) { r.Header.Del("Content-Type") }); r.code != 200 {
		t.Fatalf("bodyless logout: want 200, got %d", r.code)
	}
}

func TestRegisterExistingVerifiedIsNoop(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()
	signup(t, app, email, "rahasia123")

	r := call(t, app, "POST", "/api/v1/auth/register", fiber.Map{"full_name": "Eve", "email": email, "password": "attacker12"})
	if r.code != 202 {
		t.Fatalf("want same generic 202, got %d", r.code)
	}
	noMail(t)
	if r := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": email, "password": "rahasia123"}); r.code != 200 {
		t.Fatalf("original password must still work: %d", r.code)
	}
}

func TestRegisterTakesOverUnverified(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()
	call(t, app, "POST", "/api/v1/auth/register", fiber.Map{"full_name": "Eve", "email": email, "password": "attacker12"})
	first := nextMailToken(t)
	signup(t, app, email, "rahasia123") // the real owner registers later and verifies

	if r := call(t, app, "POST", "/api/v1/auth/verify-email", fiber.Map{"token": first}); r.code != 400 {
		t.Fatalf("superseded verify token: want 400, got %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": email, "password": "attacker12"}); r.code != 401 {
		t.Fatalf("first registrant's password: want 401, got %d", r.code)
	}
}

func TestLoginFailureLimit(t *testing.T) {
	app := newApp(testDB, "")
	for i := 1; i <= 6; i++ {
		r := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": "nobody@test.id", "password": "salah12345"})
		if want := map[bool]int{true: 401, false: 429}[i <= 5]; r.code != want {
			t.Fatalf("attempt %d: want %d, got %d", i, want, r.code)
		}
	}
}

func TestPasswordReset(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()
	old := signup(t, app, email, "rahasia123")

	call(t, app, "POST", "/api/v1/auth/forgot-password", fiber.Map{"email": email})
	token := nextMailToken(t)
	if r := call(t, app, "POST", "/api/v1/auth/reset-password", fiber.Map{"token": token, "password": "baru123456"}); r.code != 200 {
		t.Fatalf("reset: %d %v", r.code, r.body)
	}
	if r := call(t, app, "POST", "/api/v1/auth/reset-password", fiber.Map{"token": token, "password": "lagi123456"}); r.code != 400 {
		t.Fatalf("reset token reuse: want 400, got %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/refresh", nil, withCookies(old.cookies)); r.code != 401 {
		t.Fatalf("refresh after reset: want 401, got %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/login", fiber.Map{"email": email, "password": "baru123456"}); r.code != 200 {
		t.Fatalf("login with new password: %d", r.code)
	}

	call(t, app, "POST", "/api/v1/auth/forgot-password", fiber.Map{"email": email})
	expired := nextMailToken(t)
	if _, err := testDB.Exec(context.Background(),
		"update email_tokens set expires_at = now() - interval '1 second' where user_id = (select id from users where email = $1) and used_at is null", email); err != nil {
		t.Fatal(err)
	}
	if r := call(t, app, "POST", "/api/v1/auth/reset-password", fiber.Map{"token": expired, "password": "lagi123456"}); r.code != 400 {
		t.Fatalf("expired reset token: want 400, got %d", r.code)
	}
}

func TestForgotUnknownEmailIsGeneric(t *testing.T) {
	app := newApp(testDB, "")
	if r := call(t, app, "POST", "/api/v1/auth/forgot-password", fiber.Map{"email": "nobody@test.id"}); r.code != 200 {
		t.Fatalf("want 200, got %d", r.code)
	}
	noMail(t)
}

// app.Test connections come from 0.0.0.0.
func TestRateLimitRealIP(t *testing.T) {
	forgot := func(app *fiber.App, ip string) int {
		return call(t, app, "POST", "/api/v1/auth/forgot-password", fiber.Map{"email": "nobody@test.id"},
			func(r *http.Request) { r.Header.Set("X-Real-IP", ip) }).code
	}

	trusted := newApp(testDB, "0.0.0.0")
	for range 20 {
		forgot(trusted, "1.1.1.1")
	}
	if c := forgot(trusted, "1.1.1.1"); c != 429 {
		t.Fatalf("21st from same real IP: want 429, got %d", c)
	}
	if c := forgot(trusted, "2.2.2.2"); c != 200 {
		t.Fatalf("other real IP behind trusted proxy: want 200, got %d", c)
	}

	untrusted := newApp(testDB, "")
	for range 20 {
		forgot(untrusted, "1.1.1.1")
	}
	if c := forgot(untrusted, "2.2.2.2"); c != 429 {
		t.Fatalf("spoofed X-Real-IP from untrusted peer: want 429, got %d", c)
	}
}

func TestTokenPurposeMismatch(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()
	call(t, app, "POST", "/api/v1/auth/register", fiber.Map{"full_name": "Siti", "email": email, "password": "rahasia123"})
	verify := nextMailToken(t)
	if r := call(t, app, "POST", "/api/v1/auth/reset-password", fiber.Map{"token": verify, "password": "attacker12"}); r.code != 400 {
		t.Fatalf("verify token at reset: want 400, got %d", r.code)
	}
	if r := call(t, app, "POST", "/api/v1/auth/verify-email", fiber.Map{"token": verify}); r.code != 200 {
		t.Fatalf("verify token must be untouched by the failed reset: got %d", r.code)
	}
}

// Two simultaneous resets with one token: exactly one may win.
func TestResetTokenConcurrentUse(t *testing.T) {
	app := newApp(testDB, "")
	email := newEmail()
	signup(t, app, email, "rahasia123")
	call(t, app, "POST", "/api/v1/auth/forgot-password", fiber.Map{"email": email})
	token := nextMailToken(t)

	codes := make(chan int, 2)
	for _, pw := range []string{"pertama123", "kedua12345"} {
		go func() {
			codes <- call(t, app, "POST", "/api/v1/auth/reset-password", fiber.Map{"token": token, "password": pw}).code
		}()
	}
	got := map[int]int{}
	got[<-codes]++
	got[<-codes]++
	if got[200] != 1 || got[400] != 1 {
		t.Fatalf("want one 200 and one 400, got %v", got)
	}
}

func TestAccessTokenRejected(t *testing.T) {
	app := newApp(testDB, "")
	bearer := func(tok string) func(*http.Request) {
		return func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+tok) }
	}
	// A real user, so a 401 can only come from the token check, not "user not found".
	uid := signup(t, app, newEmail(), "rahasia123").body["data"].(map[string]any)["user"].(map[string]any)["id"].(string)
	valid, _ := signToken("access", uid, "customer", 0, time.Minute)
	if r := call(t, app, "GET", "/api/v1/auth/me", nil, bearer(valid)); r.code != 200 {
		t.Fatalf("control: valid token want 200, got %d", r.code)
	}
	expired, _ := signToken("access", uid, "customer", 0, -time.Minute)
	key := jwtKey
	jwtKey = []byte("someone-elses-key")
	forged, _ := signToken("access", uid, "manager", 0, time.Minute)
	jwtKey = key
	for name, tok := range map[string]string{"expired": expired, "wrong key": forged, "garbage": "abc.def.ghi"} {
		if r := call(t, app, "GET", "/api/v1/auth/me", nil, bearer(tok)); r.code != 401 {
			t.Fatalf("%s token: want 401, got %d", name, r.code)
		}
	}
}

func TestLogoutClearsCookies(t *testing.T) {
	app := newApp(testDB, "")
	session := signup(t, app, newEmail(), "rahasia123")
	r := call(t, app, "POST", "/api/v1/auth/logout", "", withCookies(session.cookies), func(r *http.Request) { r.Header.Del("Content-Type") })
	for _, name := range []string{"access_token", "refresh_token"} {
		c := cookie(r, name)
		if c == nil || c.Value != "" || c.Expires.After(time.Now()) {
			t.Fatalf("%s not cleared: %v", name, c)
		}
	}
}

func TestRegisterValidation(t *testing.T) {
	app := newApp(testDB, "")
	ok := fiber.Map{"full_name": "Siti", "email": "valid@test.id", "password": "rahasia123", "phone_number": "081234567890"}
	with := func(k string, v any) fiber.Map {
		m := fiber.Map{}
		for kk, vv := range ok {
			m[kk] = vv
		}
		m[k] = v
		return m
	}
	cases := map[string]fiber.Map{
		"not an email":       with("email", "bukan-email"),
		"display-name email": with("email", "Siti <siti@test.id>"),
		"empty name":         with("full_name", "   "),
		"name > 100":         with("full_name", strings.Repeat("a", 101)),
		"phone > 20":         with("phone_number", strings.Repeat("1", 21)),
		"password 7 bytes":   with("password", "1234567"),
		"password 73 bytes":  with("password", strings.Repeat("a", 73)),
	}
	for name, body := range cases {
		if r := call(t, app, "POST", "/api/v1/auth/register", body); r.code != 400 {
			t.Errorf("%s: want 400, got %d %v", name, r.code, r.body)
		}
	}
	if r := call(t, app, "POST", "/api/v1/auth/reset-password", fiber.Map{"token": "x", "password": "short"}); r.code != 400 {
		t.Errorf("reset with short password: want 400, got %d", r.code)
	}
	noMail(t)
}
