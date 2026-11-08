// Better Auth: login sessions for the admin (cookies) and later the teacher app (bearer tokens, task 22).
// Its tables (user, session, account, verification) are in db/schema.ts.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Admins are created with `bun run db:seed -- --admin <email>`. Teacher sign-up arrives in task 22.
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      // input: false so nobody can make themselves an admin through the sign-up request.
      role: { type: "string", required: false, defaultValue: "teacher", input: false },
    },
  },
  plugins: [nextCookies()], // lets server actions (the login form) set the session cookie
});

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// For API route handlers: `const { error } = await requireAdmin(); if (error) return error;`
export async function requireAdmin() {
  const user = await getUser();
  if (!user) return { user: null, error: Response.json({ error: "Silakan masuk dulu" }, { status: 401 }) };
  if (user.role !== "admin") return { user: null, error: Response.json({ error: "Tidak punya akses" }, { status: 403 }) };
  return { user, error: null };
}
