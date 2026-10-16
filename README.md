# BUMILOGI

Web portal for **klik-klak**, a screen-free coding toy for children aged 4–6, 3D-printed from recycled plastic. The UI is in Indonesian.

- `api/`: Go (Fiber) REST API with Postgres. Migrations run automatically on start.
- `web/`: Next.js 16 (App Router) on Bun. UI only; it calls the Go API.
- Postgres 16 runs in Docker, in development too.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker + Compose | any recent | <https://docs.docker.com/get-docker/> |
| Go | 1.27+ (see `api/go.mod`) | <https://go.dev/dl/> |
| air (Go live reload) | latest | `go install github.com/air-verse/air@latest` |
| Bun | 1.4.2 (see `web/package.json`) | <https://bun.sh> |
| make | any | usually preinstalled on Linux/macOS |

Make sure `$(go env GOPATH)/bin` is on your `PATH` so the `air` command is found.

## Run it locally

```sh
git clone git@github.com:admir4ljoni/BUMILOGI.git
cd BUMILOGI
cp .env.example .env          # dev defaults work as-is
(cd web && bun install)
make dev
```

`make dev` starts Postgres in Docker, the API with live reload on <http://localhost:8080>, and the web app on <http://localhost:3000>. Open <http://localhost:3000>.

- In dev, the web app proxies `/api/*` to the Go API, so the browser only talks to `:3000`.
- Check the API: <http://localhost:8080/api/v1/health>.
- **Email in dev:** with `SMTP_HOST` unset, verification and password-reset mails are printed to the API log instead of being sent. Copy the link from the terminal to verify a new account.
- `Ctrl+C` stops the API and the web app. Postgres keeps running until `make stop`.

### Other commands

```sh
make db      # Postgres only
make api     # API only (needs Postgres)
make web     # web only (needs the API for pages that load data)
make stop    # stop Postgres

docker compose down -v                  # wipe the database; migrations rebuild it on next API start
docker compose exec db psql -U bumilogi # SQL shell
```

## Checks (run before committing; CI runs the same)

```sh
# API: tests need Postgres running and DATABASE_URL set
cd api
set -a; . ../.env; set +a
go vet ./... && go test ./...

# Web
cd web
bun run lint && bun run build   # build catches type/prerender errors that `bun dev` hides
```

## Project notes

- **Database changes:** add a goose SQL file `api/migrations/0000N_<name>.sql` with `-- +goose Up` / `-- +goose Down`. It is applied on the next API start.
- **Styling:** plain CSS with design tokens in `web/app/globals.css`. No Tailwind or UI library.
- **Next.js 16** is newer than most tutorials. Check `web/node_modules/next/dist/docs/` before writing Next code.
- **Preview features without a backend yet:** the product pages (`/produk/*`) read hardcoded data from `web/lib/products.ts`, and class/family management (`/kelas`) stores data in the browser's localStorage. Both are marked with `ponytail:` comments.
- See `CLAUDE.md` for architecture, workflow rules and the pre-deploy checklist.
