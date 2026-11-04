# BUMILOGI

Website for **klik-klak**, a screen-free coding toy for children aged 4–6, 3D-printed from recycled plastic. The UI is in Indonesian.

The site is a landing page and product information source, plus a virtual version of the board. There are no accounts and no checkout: buy buttons link to the BUMILOGI Shopee store.

- `web/`: Next.js 16 (App Router) on Bun. Every page is static.

## Quick start with Docker (no Bun needed)

```sh
git clone git@github.com:admir4ljoni/BUMILOGI.git
cd BUMILOGI
docker compose up --build
```

Open <http://localhost:3000>. `Ctrl+C` stops it.

## Run it locally

Needs [Bun](https://bun.sh) 1.4.2 (see `web/package.json`).

```sh
cd web
bun install
bun dev        # http://localhost:3000
```

## Checks (run before committing; CI runs the same)

```sh
cd web
bun run lint && bun run build   # build catches type/prerender errors that `bun dev` hides
```

## Project notes

- **Product data and the Shopee link** live in `web/lib/products.ts`.
- **Styling:** plain CSS with design tokens in `web/app/globals.css`. No Tailwind or UI library.
- **Next.js 16** is newer than most tutorials. Check `web/node_modules/next/dist/docs/` before writing Next code.
- See `CLAUDE.md` for architecture and workflow rules.
