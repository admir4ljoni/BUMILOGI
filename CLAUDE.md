# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BUMILOGI: a screen-free coding toy for children aged 4–6, built as a campus competition research project (not a business). The goal is to collect data on how children's computational thinking develops. UI copy is Indonesian (`<html lang="id">`).

Parts:
- **Website** (`web/`, Next.js App Router on Bun): landing page, edition pages with "Beli Sekarang" links to Shopee, and the virtual board (`/papan-koding`). Exists today.
- **Admin dashboard** (`/admin`) and **REST API** (`/api/v1/*`, `/api/auth/*`) in the same Next app, on Vercel Hobby with Neon Postgres. Being built (tasks 18–23).
- **Teacher app** (`mobile/`, Flutter, Android): classrooms, students, entering children's answers, progress charts, CSV export. Being built (tasks 24–29).

Planning docs are local-only (gitignored): `docs/PLAN.md` (architecture, database tables, business rules and API; read it before any feature work), `TASKS.md` (ordered vertical slices, check off as done), `COMMANDS.md`, `docs/design/DESIGN.md`. `docs/api/*` and `docs/database/*` describe the old Go portal and are out of date; PLAN.md replaces them.

## Keep it simple

This is a small project: a few teachers, one or two admins, around 50 requests a day. Write plain, textbook code that a student can read top to bottom.

- Use the most obvious way to do something: plain functions, `if`/`for`, straightforward queries. No design patterns, layers, factories, generic helpers, or wrapper classes unless the same code is already repeated three times.
- No caching layers, queues, background jobs, retries, or performance tuning. Nothing at this scale needs them.
- Clear names over short or clever ones. Short functions that do one thing. Comments explain *why*, not *what*.
- Add a dependency only when a few lines of our own code can't do the job, and ask first for anything not listed in PLAN.md's stack.
- Don't build for features nobody asked for. If something seems to need a new service or a bigger design, ask first.
- Still never skip: validating input at the API, checking login and ownership, and error handling that prevents losing research data.

## Commands

```sh
docker compose up -d db  # (repo root) Postgres 16 on localhost:5432
# web/  (first time: cp .env.example .env.local)
bun install
bun run db:migrate       # applies drizzle/*.sql (lib/db/migrate.ts)
bun run db:seed          # editions + starter levels, only into an empty database (lib/seed.ts)
bun run db:seed -- --admin <email>  # also make that user an admin; creates it and prints a password if new
bun run db:generate      # after editing lib/db/schema.ts: writes a new SQL file to commit
bun dev                  # :3000
bun test                 # lib/*.test.ts, plus app/api/v1/api.test.ts against the Docker db (.env.test)
bun run lint
bun run build            # needs the database (pages prerender from it); catches errors `bun dev` hides
docker compose up --build  # (repo root) db + site in a container on :3000; migrates, seeds, builds on start
```

CI (`.github/workflows/ci.yml`) starts a Postgres 16 service and runs exactly: `bun install --frozen-lockfile && bun run db:migrate && bun test && bun run lint && bun run db:seed && bun run build`.

## Architecture

- **One Next app** serves the public site, `/admin`, and the API. Server logic lives only in route handlers under `web/app/api/`. Public pages stay prerendered and are regenerated when an admin saves.
- **Data** lives in Postgres via Drizzle: tables in `web/lib/db/schema.ts` (TS keys = snake_case column names), SQL migrations in `web/drizzle/`. Public pages read through the `"use cache"` functions in `web/lib/db/site.ts` (tags `editions`, `levels`), so they prerender at build; admin API saves call `revalidateTag(tag, { expire: 0 })`. A `[slug]` page reads `params` inside `<Suspense>` and looks its row up with a per-slug cached function (`getEdition(slug)`): filtering a cached list returned stale data on the first visit after a save and showed a 404.
- **Board rules** (same as the physical toy): 6×6 grid, four tiles (atas, bawah, kiri, kanan), at most 18 tiles, no loop tile. `web/lib/board.ts` is pure TypeScript with `run()` and `solve()` (BFS shortest program), tested in `board.test.ts`; both take a level row's columns (`start_x`, `target_y`, `obstacles`, …) directly. The admin editor, the virtual board and the API all use it; `components/coding-board.tsx` only animates its steps on a canvas.
- **Auth:** Better Auth in `web/lib/auth.ts` (`getUser()`, `requireAdmin()` for route handlers), mounted at `/api/auth/[...all]`; its tables sit in `schema.ts` with camelCase keys (its adapter needs them) and snake_case columns. `user.role` is `'teacher'` or `'admin'`; anyone can sign up as a teacher. The app sends `Authorization: Bearer <token>` (the `token` from sign-in), the web uses cookies. Reset emails go through `lib/email.ts` (Gmail SMTP; without `SMTP_USER` the link is printed to the server log) to `/reset-password`. Pages that read the session set `instant = false`.
- **Routes:** public pages live in `app/(site)/` (its layout has the header, footer and motion); `app/not-found.tsx` adds the header and footer itself. The admin is `app/admin/`: `login/` and the "Tidak punya akses" page sit outside `(panel)/`, whose layout has the admin bar and calls `requireAdminPage()`; every panel page calls it too (layouts don't re-run on navigation). Admin forms are client components that call `/api/v1/*`. In production these redirects happen inside a streamed 200, so the login form does a full page load (`location.assign`) instead of `redirect()`. Next keeps a visited page's React state, so reset a create form after saving.
- **The server grades attempts.** The app sends only the program; the server runs `run()` (via `grade()` in `lib/teacher.ts`) and stores the verdict. Teacher routes look records up with `lib/owned.ts`, which returns null for other teachers' rows (→ 404). Route handlers call `requireUser(request)`/`requireAdmin(request)` with the request, so `api.test.ts` can call them directly with bearer tokens. Chart data and the CSV come from `lib/research.ts`. See PLAN.md "Business rules" for level locking, ownership (404 for others' data) and admin roles.
- **Buy buttons** are plain `<a target="_blank" rel="noopener noreferrer">` links to Shopee; price, payment and shipping happen there.
- **Next.js version is newer than training data** (Next 16 / React 19, see `web/AGENTS.md`). Read the relevant guide in `web/node_modules/next/dist/docs/` before writing Next code and heed deprecations. `next dev` re-adds the AGENTS.md block, so commit it rather than removing it.
- **Motion:** `web/components/motion.tsx` holds the preloader (also the page-transition curtain for internal links), the scroll reveal (`data-reveal`) and scroll scenes (`data-scroll` → `--in/--out/--p`). Everything must stay visible without JS and switch off under `prefers-reduced-motion`.
- **Styling:** plain CSS with design tokens as CSS variables in `web/app/globals.css` plus inline `style` props. No Tailwind or UI library, in the admin too. White base, brand colors as accents; Unbounded (headings) + Lexend (body) from `next/font/google` in `layout.tsx`. Things you can touch (board, tiles, buttons) get an ink edge and a hard bottom shadow; information stays flat. Use the `-deep` color shades for colored text; never put white text on brand colors. `--blue` was added for Set Samudra. An edition's color is `editions.color`, a token name used as `var(--${color})`. The 2026-11-05 redesign supersedes DESIGN.md's cream base, fonts and all-caps labels.
- **Secrets** live in `web/.env.local` locally and in Vercel's environment variables in production. Never commit them or paste them into chat.

## Workflow rules

- **Branching:** never commit directly to `main`. Make one branch per `TASKS.md` slice or fix, named `<type>/<short-slug>` (e.g. `feat/admin-levels`, `fix/attempt-grading`, `docs/claude-md`), and branch from an up-to-date `main`. Merge back into `main` with `--no-ff` once the checks pass, and keep the branch afterwards (don't delete it).
- **Check after every change:** run `bun test && bun run lint && bun run build` in `web/` before you commit (and `flutter analyze && flutter test` in `mobile/` once it exists).
  - Don't commit while a check is failing. Fix it, or report the output.
- **Commit after every change:** make one focused commit per logical change, not one batch at the end. Write an imperative subject of 72 characters or fewer that says what changed (e.g. `Add email verify endpoint`, not `update`). Add a body explaining *why* when that isn't obvious.
- **No AI attribution:** don't add `Co-Authored-By: Claude` or any other Claude/AI attribution lines to commits or PRs.

## Before any prod or staging deploy

**Remind the user of this whole checklist whenever they talk about deploying, pushing to prod/staging, setting up Vercel or Neon, or starting task 14.** Tick items off here as they're done; delete the section when it's empty.

- [ ] **Shopee:** real store URL (`SHOPEE_URL` placeholder in `web/lib/products.ts`) and listing URLs (`editions.shopee_url`, seeded with the placeholder; editable in the admin after task 20).
- [ ] **Vercel project:** root directory `web`, build command `bun run db:migrate && bun run build`, functions region `sin1`.
- [ ] **Neon:** added from Vercel Storage, region Singapore, pooled connection string.
- [ ] **Env vars** set in Vercel: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and the Blob, SMTP and Google ones once those tasks are done.
- [ ] **First admin** seeded in production.
- [ ] **Google OAuth** redirect URI for the production URL (once task 28 is done).
- [ ] **Verify live:** open the site from a WhatsApp link on a real Android phone; buy buttons open the Shopee app/listing; admin login works.

## Conventions

- Deliberate shortcuts are marked with `ponytail:` comments that name their limit and the upgrade path.
