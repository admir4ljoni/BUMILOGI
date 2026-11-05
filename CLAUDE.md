# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BUMILOGI: website for a screen-free coding toy (Indonesian, ages 4–6). It is a landing page and product information source plus a virtual version of the board (the simulator). There is no login, no dashboard and no backend: buy buttons link to Shopee. Next.js (App Router, Bun) in `web/`. UI copy is Indonesian (`<html lang="id">`).

Planning docs are local-only (gitignored): `docs/PLAN.md` (architecture and business rules, read it before any feature work), `TASKS.md` (ordered vertical slices, check off as done), `COMMANDS.md`, `docs/api/api_spec_BUMILOGI.yaml`, `docs/database/erd.mmd`, `docs/design/DESIGN.md`. The API spec, ERD and the auth/order parts of PLAN.md describe the old portal (removed 2026-11-04, kept in git history and the `feat/*` branches); ignore them unless that scope comes back.

## Commands

```sh
# web/
bun install
bun dev                  # :3000
bun test                 # lib/board.test.ts
bun run lint
bun run build            # catches type/prerender errors `bun dev` hides
docker compose up --build  # site in a container on :3000
```

CI (`.github/workflows/ci.yml`) runs exactly: `bun install --frozen-lockfile && bun test && bun run lint && bun run build`.

## Architecture

- **Static site.** Every page prerenders. Product data and the Shopee links are constants in `web/lib/products.ts`. Buy buttons are plain `<a target="_blank" rel="noopener noreferrer">` to Shopee; price, payment and shipping happen there.
- **No server logic:** no API, database, auth, cookies or Next API routes. If a feature seems to need one, ask first.
- **Virtual board** (`/papan-koding`): `web/lib/board.ts` is the pure engine plus hardcoded missions, tested in `board.test.ts`; `components/coding-board.tsx` only animates its steps on a canvas.
- **Next.js version is newer than training data** (Next 16 / React 19, see `web/AGENTS.md`). Read the relevant guide in `web/node_modules/next/dist/docs/` before writing Next code and heed deprecations. `next dev` re-adds the AGENTS.md block, so commit it rather than removing it.
- **Styling:** plain CSS with design tokens as CSS variables in `web/app/globals.css` plus inline `style` props. No Tailwind or UI library. White base, brand colors as accents; Unbounded (headings) + Lexend (body) from `next/font/google` in `layout.tsx`. Things you can touch (board, tiles, buttons) get an ink edge and a hard bottom shadow; information stays flat. Use the `-deep` color shades for colored text; never put white text on brand colors. `--blue` was added for Set Samudra (edition colors live in `EDITION_COLOR`). The 2026-11-05 redesign supersedes DESIGN.md's cream base, fonts and all-caps labels.

## Workflow rules

- **Branching:** never commit directly to `main`. Make one branch per `TASKS.md` slice or fix, named `<type>/<short-slug>` (e.g. `feat/auth-email`, `fix/health-timeout`, `docs/claude-md`), and branch from an up-to-date `main`. Merge back into `main` with `--no-ff` once the checks pass, and keep the branch afterwards (don't delete it).
- **Check after every change:** run `bun test && bun run lint && bun run build` in `web/` before you commit.
  - Don't commit while a check is failing. Fix it, or report the output.
- **Commit after every change:** make one focused commit per logical change, not one batch at the end. Write an imperative subject of 72 characters or fewer that says what changed (e.g. `Add email verify endpoint`, not `update`). Add a body explaining *why* when that isn't obvious.
- **No AI attribution:** don't add `Co-Authored-By: Claude` or any other Claude/AI attribution lines to commits or PRs.

## Before any prod or staging deploy

**Remind the user of this whole checklist whenever they talk about deploying, pushing to prod/staging, setting up the VPS, or starting task 14.** Tick items off here as they're done; delete the section when it's empty.

- [ ] **Shopee:** real store/listing URLs in `web/lib/products.ts` (now a placeholder).
- [ ] **Hosting:** HTTPS (certbot behind Nginx, or a static host).
- [ ] **Verify live:** open the site from a WhatsApp link on a real Android; buy buttons open the Shopee app/listing.

## Conventions

- Deliberate shortcuts are marked with `ponytail:` comments that name their limit and the upgrade path.
