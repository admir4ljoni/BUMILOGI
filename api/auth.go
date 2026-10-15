package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/mail"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtKey []byte
	appURL string // e.g. https://bumilogi.com, used for mail links and the cookie Secure flag
)

const (
	accessTTL  = 15 * time.Minute
	refreshTTL = 7 * 24 * time.Hour
	verifyTTL  = 24 * time.Hour
	resetTTL   = time.Hour
	bcryptCost = 12
)

// Compared against when the email is unknown, so login takes the same time either way.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password"), bcryptCost)

const genericMailMsg = "Jika email terdaftar, kami telah mengirim tautan ke email tersebut."

type user struct {
	ID         string     `json:"id"`
	FullName   string     `json:"full_name"`
	Email      string     `json:"email"`
	Phone      *string    `json:"phone_number"`
	Role       string     `json:"role"`
	VerifiedAt *time.Time `json:"email_verified_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// Also selects the two private columns: password_hash (nil = Google-only) and token_version.
const userCols = "id, full_name, email, phone, role, email_verified_at, created_at, password_hash, token_version"

func scanUser(row pgx.Row) (u user, hash *string, version int, err error) {
	err = row.Scan(&u.ID, &u.FullName, &u.Email, &u.Phone, &u.Role, &u.VerifiedAt, &u.CreatedAt, &hash, &version)
	return
}

func authRoutes(r fiber.Router, db *pgxpool.Pool) {
	tooMany := func(c *fiber.Ctx) error {
		return fail(c, fiber.StatusTooManyRequests, "Terlalu banyak percobaan. Coba lagi dalam satu menit.")
	}
	// 20/min/IP on the endpoints that send mail or take passwords (NFR-TRAF-05).
	// refresh/logout/me are exempt: Next middleware calls refresh server-side, so
	// in prod every refresh shares the web container's IP.
	limit := limiter.New(limiter.Config{Max: 20, Expiration: time.Minute, LimitReached: tooMany})
	// AC-AUTH-04: 5 failed logins/min/IP.
	loginFails := limiter.New(limiter.Config{Max: 5, Expiration: time.Minute, SkipSuccessfulRequests: true, LimitReached: tooMany})

	a := r.Group("/auth")
	a.Post("/register", limit, register(db))
	a.Post("/login", limit, loginFails, login(db))
	a.Post("/verify-email", limit, verifyEmail(db))
	a.Post("/forgot-password", limit, forgotPassword(db))
	a.Post("/reset-password", limit, resetPassword(db))
	a.Post("/refresh", refresh(db))
	a.Post("/logout", logout)
	a.Get("/me", requireAuth, me(db))
}

func register(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in struct {
			FullName string `json:"full_name"`
			Email    string `json:"email"`
			Password string `json:"password"`
			Phone    string `json:"phone_number"`
		}
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		in.FullName, in.Phone = strings.TrimSpace(in.FullName), strings.TrimSpace(in.Phone)
		email, err := parseEmail(in.Email)
		if err != nil {
			return err
		}
		if in.FullName == "" || len(in.FullName) > 100 || len(in.Phone) > 20 {
			return fiber.NewError(fiber.StatusBadRequest, "Nama wajib diisi (maks. 100 karakter)")
		}
		hash, err := hashPassword(in.Password)
		if err != nil {
			return err
		}

		// New email → insert. Existing but unverified → the newest registration
		// takes over the row, so whoever registered first can't keep a password on
		// an email they don't own. Verified → no-op. Same response either way.
		var id string
		err = db.QueryRow(c.Context(), `
			insert into users (email, full_name, phone, password_hash) values ($1, $2, nullif($3, ''), $4)
			on conflict (email) do update
				set full_name = excluded.full_name, phone = excluded.phone,
				    password_hash = excluded.password_hash, updated_at = now()
				where users.email_verified_at is null
			returning id`, email, in.FullName, in.Phone, hash).Scan(&id)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err == nil {
			token, err := newEmailToken(c, db, id, "verify", verifyTTL)
			if err != nil {
				return err
			}
			go sendMail(email, "Verifikasi email BUMILOGI",
				"Halo "+in.FullName+",\n\nKlik tautan ini untuk memverifikasi email kamu (berlaku 24 jam):\n"+
					appURL+"/verify-email?token="+token+"\n\nAbaikan email ini jika kamu tidak mendaftar.")
		}
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"status": "success", "message": genericMailMsg})
	}
}

func login(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in struct{ Email, Password string }
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		u, hash, version, err := scanUser(db.QueryRow(c.Context(),
			"select "+userCols+" from users where email = $1", strings.TrimSpace(in.Email)))
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		h := dummyHash
		if hash != nil {
			h = []byte(*hash)
		}
		if bcrypt.CompareHashAndPassword(h, []byte(in.Password)) != nil || hash == nil {
			return fail(c, fiber.StatusUnauthorized, "Email atau kata sandi salah")
		}
		if u.VerifiedAt == nil {
			return fail(c, fiber.StatusForbidden, "Email belum diverifikasi. Cek kotak masuk email kamu.")
		}
		return startSession(c, u, version)
	}
}

func verifyEmail(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in struct{ Token string }
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		return consumeToken(c, db, in.Token, "verify",
			"update users set email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where id = $1")
	}
}

func forgotPassword(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in struct{ Email string }
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		var id, name, email string
		err := db.QueryRow(c.Context(), "select id, full_name, email from users where email = $1",
			strings.TrimSpace(in.Email)).Scan(&id, &name, &email)
		if err == nil {
			token, err := newEmailToken(c, db, id, "reset", resetTTL)
			if err != nil {
				return err
			}
			go sendMail(email, "Atur ulang kata sandi BUMILOGI",
				"Halo "+name+",\n\nKlik tautan ini untuk membuat kata sandi baru (berlaku 1 jam):\n"+
					appURL+"/reset-password?token="+token+"\n\nAbaikan email ini jika kamu tidak memintanya.")
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		return ok(c, fiber.Map{"message": genericMailMsg})
	}
}

func resetPassword(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var in struct{ Token, Password string }
		if err := c.BodyParser(&in); err != nil {
			return fiber.ErrBadRequest
		}
		hash, err := hashPassword(in.Password)
		if err != nil {
			return err
		}
		// The link proved email ownership, so it also verifies. Bumping
		// token_version kills every refresh token issued before the reset.
		return consumeToken(c, db, in.Token, "reset",
			`update users set password_hash = $2, token_version = token_version + 1,
				email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where id = $1`, hash)
	}
}

// consumeToken marks a verify/reset token used (atomically, so it works once),
// runs update on its user in the same transaction, then logs the user in.
func consumeToken(c *fiber.Ctx, db *pgxpool.Pool, token, purpose, update string, args ...any) error {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(raw) != 32 {
		return fail(c, fiber.StatusBadRequest, "Tautan tidak valid atau sudah kedaluwarsa")
	}
	sum := sha256.Sum256(raw)
	tx, err := db.Begin(c.Context())
	if err != nil {
		return err
	}
	defer tx.Rollback(c.Context())
	var id string
	err = tx.QueryRow(c.Context(), `
		update email_tokens set used_at = now()
		where token_hash = $1 and purpose = $2 and used_at is null and expires_at > now()
		returning user_id`, sum[:], purpose).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return fail(c, fiber.StatusBadRequest, "Tautan tidak valid atau sudah kedaluwarsa")
	}
	if err != nil {
		return err
	}
	if _, err := tx.Exec(c.Context(), update, append([]any{id}, args...)...); err != nil {
		return err
	}
	u, _, version, err := scanUser(tx.QueryRow(c.Context(), "select "+userCols+" from users where id = $1", id))
	if err != nil {
		return err
	}
	if err := tx.Commit(c.Context()); err != nil {
		return err
	}
	return startSession(c, u, version)
}

func refresh(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tok := c.Cookies("refresh_token")
		if tok == "" {
			var in struct {
				RefreshToken string `json:"refresh_token"` // v2 mobile sends it in the body
			}
			_ = c.BodyParser(&in)
			tok = in.RefreshToken
		}
		claims, err := parseToken(tok, "refresh")
		if err != nil {
			clearSession(c)
			return fail(c, fiber.StatusUnauthorized, "Sesi berakhir, silakan masuk lagi")
		}
		u, _, version, err := scanUser(db.QueryRow(c.Context(), "select "+userCols+" from users where id = $1", claims.Subject))
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && version != claims.Version) {
			clearSession(c)
			return fail(c, fiber.StatusUnauthorized, "Sesi berakhir, silakan masuk lagi")
		}
		if err != nil {
			return err
		}
		return startSession(c, u, version)
	}
}

func logout(c *fiber.Ctx) error {
	clearSession(c)
	return ok(c, nil)
}

func me(db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		u, _, _, err := scanUser(db.QueryRow(c.Context(), "select "+userCols+" from users where id = $1", c.Locals("uid")))
		if errors.Is(err, pgx.ErrNoRows) {
			return fail(c, fiber.StatusUnauthorized, "Silakan masuk terlebih dahulu")
		}
		if err != nil {
			return err
		}
		return ok(c, u)
	}
}

// requireAuth accepts the access cookie (web) or a Bearer header (v2 mobile)
// and sets Locals "uid" and "role".
func requireAuth(c *fiber.Ctx) error {
	tok := c.Cookies("access_token")
	if h := c.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		tok = strings.TrimPrefix(h, "Bearer ")
	}
	claims, err := parseToken(tok, "access")
	if err != nil {
		return fail(c, fiber.StatusUnauthorized, "Silakan masuk terlebih dahulu")
	}
	c.Locals("uid", claims.Subject)
	c.Locals("role", claims.Role)
	return c.Next()
}

type claims struct {
	Type    string `json:"typ"`
	Role    string `json:"role,omitempty"`
	Version int    `json:"ver,omitempty"`
	jwt.RegisteredClaims
}

func signToken(typ, uid, role string, version int, ttl time.Duration) (string, error) {
	now := time.Now()
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims{typ, role, version, jwt.RegisteredClaims{
		Subject: uid, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}}).SignedString(jwtKey)
}

func parseToken(tok, typ string) (*claims, error) {
	var cl claims
	_, err := jwt.ParseWithClaims(tok, &cl, func(*jwt.Token) (any, error) { return jwtKey, nil },
		jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil {
		return nil, err
	}
	if cl.Type != typ {
		return nil, errors.New("wrong token type")
	}
	return &cl, nil
}

// startSession issues an access + refresh pair as httpOnly cookies and in the body (for v2 mobile).
func startSession(c *fiber.Ctx, u user, version int) error {
	access, err := signToken("access", u.ID, u.Role, 0, accessTTL)
	if err != nil {
		return err
	}
	refresh, err := signToken("refresh", u.ID, "", version, refreshTTL)
	if err != nil {
		return err
	}
	setCookie(c, "access_token", access, accessTTL)
	setCookie(c, "refresh_token", refresh, refreshTTL)
	return ok(c, fiber.Map{"user": u, "tokens": fiber.Map{
		"access_token": access, "refresh_token": refresh, "expires_in": int(accessTTL.Seconds()),
	}})
}

func clearSession(c *fiber.Ctx) {
	setCookie(c, "access_token", "", -time.Hour)
	setCookie(c, "refresh_token", "", -time.Hour)
}

// Path "/" on both: Next middleware must see the refresh cookie on page requests.
func setCookie(c *fiber.Ctx, name, value string, ttl time.Duration) {
	c.Cookie(&fiber.Cookie{
		Name: name, Value: value, Path: "/", Expires: time.Now().Add(ttl),
		HTTPOnly: true, Secure: strings.HasPrefix(appURL, "https://"), SameSite: fiber.CookieSameSiteLaxMode,
	})
}

// newEmailToken stores the SHA-256 of a random 32-byte token and returns the raw
// token for the link. Older unused tokens of the same purpose are revoked.
func newEmailToken(c *fiber.Ctx, db *pgxpool.Pool, uid, purpose string, ttl time.Duration) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	_, err := db.Exec(c.Context(), `
		with revoked as (delete from email_tokens where expires_at < now() or (user_id = $2 and purpose = $3 and used_at is null))
		insert into email_tokens (token_hash, user_id, purpose, expires_at) values ($1, $2, $3, $4)`,
		sum[:], uid, purpose, time.Now().Add(ttl))
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func parseEmail(s string) (string, error) {
	s = strings.TrimSpace(s)
	a, err := mail.ParseAddress(s)
	if err != nil || a.Address != s || len(s) > 254 {
		return "", fiber.NewError(fiber.StatusBadRequest, "Format email tidak valid")
	}
	return s, nil
}

// Min 8, no composition rules. Max 72 bytes is bcrypt's input limit.
func hashPassword(p string) (string, error) {
	if len(p) < 8 || len(p) > 72 {
		return "", fiber.NewError(fiber.StatusBadRequest, "Kata sandi minimal 8 karakter (maks. 72)")
	}
	h, err := bcrypt.GenerateFromPassword([]byte(p), bcryptCost)
	return string(h), err
}
