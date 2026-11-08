// `bun run db:migrate`: applies the SQL files in drizzle/ that haven't run yet.
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from ".";

await migrate(db, { migrationsFolder: "drizzle" });
await client.end();
console.log("Migrations applied.");
