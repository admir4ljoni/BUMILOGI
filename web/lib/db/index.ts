import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see web/.env.example)");

// prepare: false because Neon's pooled connection string doesn't support prepared statements.
// onnotice: hides Postgres's "already exists, skipping" notices when migrations re-run.
const client = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });

export const db = drizzle(client, { schema });
export { client };
