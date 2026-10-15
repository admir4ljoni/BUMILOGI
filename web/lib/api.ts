import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8080";

// Server-side call to the Go API, passing the user's cookies through.
export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; data?: T; message?: string }> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: { ...init?.headers, cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, data: body.data, message: body.message };
}

export type User = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: "customer" | "manager";
  email_verified_at: string | null;
  created_at: string;
};
