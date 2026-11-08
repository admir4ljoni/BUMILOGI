# BUMILOGI

Website for **klik-klak**, a screen-free coding toy for children aged 4–6, 3D-printed from recycled plastic. The UI is in Indonesian.

The site is a landing page and product information source, plus a virtual version of the board. There are no accounts and no checkout: buy buttons link to the BUMILOGI online store.

- `web/`: Next.js 16 (App Router) on Bun. Public pages are prerendered from a Postgres database (Drizzle ORM).

## Quick start with Docker (no Bun needed)

```sh
git clone git@github.com:admir4ljoni/BUMILOGI.git
cd BUMILOGI
docker compose up --build
```

This starts Postgres and the site; the site container migrates, seeds and builds on start, so give it a minute. Open <http://localhost:3000>. `Ctrl+C` stops it.

## Run it locally

Needs [Bun](https://bun.sh) 1.4.2 (see `web/package.json`) and Docker for the database.

```sh
docker compose up -d db          # Postgres 16 on localhost:5432
cd web
cp .env.example .env.local
bun install
bun run db:migrate && bun run db:seed
bun dev                          # http://localhost:3000
```

## Checks (run before committing; CI runs the same)

```sh
cd web
bun test && bun run lint && bun run build   # build needs the database; catches errors `bun dev` hides
```

## Project notes

- **Editions and levels** live in the database: schema in `web/lib/db/schema.ts`, migrations in `web/drizzle/` (`bun run db:generate` after a schema change), starter data in `web/lib/seed.ts`.
- **Styling:** plain CSS with design tokens in `web/app/globals.css`. No Tailwind or UI library.
- **Next.js 16** is newer than most tutorials. Check `web/node_modules/next/dist/docs/` before writing Next code.
- See `CLAUDE.md` for architecture and workflow rules.
