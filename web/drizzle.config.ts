// Only used by `bun run db:generate` (schema.ts → new SQL file in drizzle/). Migrations run with lib/db/migrate.ts.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
});
