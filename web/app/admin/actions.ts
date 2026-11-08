"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type SignInState = { error: string; email: string; goTo?: never } | { goTo: string; error?: never; email?: never } | null;

// On failure returns the error plus the typed email, because React clears the form after the action.
// On success returns where to go; the form then loads that page fully (see login-form.tsx).
export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Isi email dan kata sandi.", email };

  let role;
  try {
    const result = await auth.api.signInEmail({ body: { email, password } }); // nextCookies() sets the session cookie
    role = result.user.role;
  } catch (error) {
    // Wrong email or password: say so without revealing which one. Anything else is a real error.
    if (error instanceof APIError && error.status === "UNAUTHORIZED") return { error: "Email atau kata sandi salah.", email };
    throw error;
  }
  return { goTo: role === "admin" ? "/admin/edisi" : "/admin" };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
