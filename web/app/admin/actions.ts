"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Returns the error plus the typed email, because React clears the form after the action runs.
export async function signIn(_prev: { error: string; email: string } | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Isi email dan kata sandi.", email };

  try {
    await auth.api.signInEmail({ body: { email, password } }); // nextCookies() sets the session cookie
  } catch (error) {
    // Wrong email or password: say so without revealing which one. Anything else is a real error.
    if (error instanceof APIError && error.status === "UNAUTHORIZED") return { error: "Email atau kata sandi salah.", email };
    throw error;
  }
  redirect("/admin");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
