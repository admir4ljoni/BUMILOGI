// Better Auth: login sessions for the admin (cookies) and the teacher app (bearer tokens).
// Its tables (user, session, account, verification) are in db/schema.ts.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendResetPasswordEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Anyone can sign up as a teacher (no email verification yet, see PLAN.md "Skipped for now").
  // Admins are made with `bun run db:seed -- --admin <email>`.
  emailAndPassword: {
    enabled: true,
    // Our own link to /reset-password instead of Better Auth's redirect URL, so the app doesn't
    // have to send a redirectTo when it asks for a reset.
    sendResetPassword: ({ user, token }) =>
      sendResetPasswordEmail(user.email, `${process.env.BETTER_AUTH_URL}/reset-password?token=${encodeURIComponent(token)}`),
    revokeSessionsOnPasswordReset: true, // a stolen phone's session stops working after a reset
  },
  user: {
    additionalFields: {
      // input: false so nobody can make themselves an admin through the sign-up request.
      role: { type: "string", required: false, defaultValue: "teacher", input: false },
    },
  },
  plugins: [
    bearer(), // the teacher app sends `Authorization: Bearer <token>` instead of a cookie
    nextCookies(), // lets server actions (the login form) set the session cookie; must stay last
  ],
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

// For admin pages: sends visitors to the login page and teachers to /admin ("Tidak punya akses").
// Every admin page calls this itself; layouts don't re-run on every navigation.
export async function requireAdminPage() {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/admin");
  return user;
}
