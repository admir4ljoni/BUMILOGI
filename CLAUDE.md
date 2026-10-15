# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BUMILOGI: web portal for screen-free coding toys (Indonesian, ages 4–6). Monorepo: Go Fiber API in `api/`, Next.js (App Router, Bun) in `web/`, Postgres 16 in Docker. UI copy is Indonesian (`<html lang="id">`).

Planning docs are local-only (gitignored): `docs/PLAN.md` (architecture and business rules, read it before any feature work), `TASKS.md` (ordered vertical slices, check off as done), `COMMANDS.md`, `docs/api/api_spec_BUMILOGI.yaml`, `docs/database/erd.mmd`, `docs/design/DESIGN.md`. Where PLAN.md disagrees with the API spec or ERD, PLAN.md wins.

## Commands

```sh
make dev                 # Postgres (docker compose) + air (api :8080) + bun dev (web :3000)
make db | make api | make web | make stop
docker compose down -v   # wipe DB; migrations rebuild it on next API start
docker compose exec db psql -U bumilogi

# api/ (tests need DATABASE_URL, e.g. from root .env, and Postgres running)
go vet ./... && go test ./...
go test -run TestName ./...

# web/
bun install
bun run lint
bun run build            # catches type/prerender errors `bun dev` hides
```

CI (`.github/workflows/ci.yml`) runs exactly: `go vet` + `go test` against a `postgres:16-alpine` service, then `bun install --frozen-lockfile && bun run lint && bun run build`. Add `bun test` to CI once the first web test file exists.

## Architecture

- **Same-origin, no CORS.** In prod Nginx routes `/` → Next and `/api/` → Go. Auth is httpOnly cookies (access JWT 15m, refresh 7d). Go is the only thing that verifies tokens.
- **Go API:** one flat `package main`, one file per domain (`auth.go`, `orders.go`, …) holding handler + SQL directly via `pgxpool`. No repository/service layers or interfaces. Routes are under `/api/v1`. Responses use the envelope `{"status": "success"|"error", "data": ...}`. Config comes only from env (`mustEnv`); `api/.air.toml` loads the root `.env`.
- **Migrations:** goose SQL files in `api/migrations/`, embedded via `go:embed` and applied automatically on API start (`api/db.go`). There's no separate migrate command. New file: `0000N_<name>.sql` with `-- +goose Up` / `-- +goose Down`.
- **Business rules live in Go handlers + Postgres constraints.** The client is never trusted for price or status. Examples: status transitions are a single `UPDATE ... WHERE status = $old`, progress is an `ON CONFLICT` upsert, and ownership failures return 404, not 403.
- **Next.js is UI only:** no business logic and no Next API routes. Server components call the Go API via `web/lib/api.ts`. The one exception is `middleware.ts`, which refreshes the session before SSR. The simulator engine (`web/lib/board.ts`) is a pure function, tested separately from the canvas.
- **Next.js version is newer than training data** (Next 16 / React 19, see `web/AGENTS.md`). Read the relevant guide in `web/node_modules/next/dist/docs/` before writing Next code and heed deprecations. `next dev` re-adds the AGENTS.md block, so commit it rather than removing it.
- **Styling:** plain CSS with design tokens as CSS variables in `web/app/globals.css` (mirroring `docs/design/DESIGN.md`) plus inline `style` props. No Tailwind or UI library. Fonts come from `next/font/google` in `layout.tsx`. Use the `-deep` color shades for colored text; never put white text on brand colors.

## Workflow rules

- **Branching:** never commit directly to `main`. Make one branch per `TASKS.md` slice or fix, named `<type>/<short-slug>` (e.g. `feat/auth-email`, `fix/health-timeout`, `docs/claude-md`), and branch from an up-to-date `main`. Merge back into `main` with `--no-ff` once the checks pass, and keep the branch afterwards (don't delete it).
- **Check after every change:** run the checks for each side you touched before you commit. Run both when a change spans both sides or the API contract.
  - Web changes: `bun run lint && bun run build` in `web/` (plus `bun test` once tests exist).
  - API changes: `go vet ./... && go test ./...` in `api/`.
  - Don't commit while a check is failing. Fix it, or report the output.
- **Commit after every change:** make one focused commit per logical change, not one batch at the end. Write an imperative subject of 72 characters or fewer that says what changed (e.g. `Add email verify endpoint`, not `update`). Add a body explaining *why* when that isn't obvious.
- **No AI attribution:** don't add `Co-Authored-By: Claude` or any other Claude/AI attribution lines to commits or PRs.

## Conventions

- Deliberate shortcuts are marked with `ponytail:` comments that name their limit and the upgrade path.
