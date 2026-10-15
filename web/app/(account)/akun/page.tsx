import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { api, type User } from "@/lib/api";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "Akun saya — BUMILOGI" };

export default function AccountPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--ink-muted)" }}>Memuat akun…</p>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const me = await api<User>("/auth/me");
  if (me.status === 401) redirect("/login?next=/akun");
  if (!me.data) throw new Error(me.message ?? "Gagal memuat akun");
  const u = me.data;
  return (
    <div className="panel">
      <p className="label" style={{ color: "var(--ink-muted)", margin: 0 }}>
        Akun saya
      </p>
      <h1 className="auth-title">Halo, {u.full_name}.</h1>
      <dl className="facts">
        <dt>Email</dt>
        <dd>{u.email}</dd>
        <dt>WhatsApp</dt>
        <dd>{u.phone_number ?? "—"}</dd>
        <dt>Bergabung</dt>
        <dd>{new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</dd>
      </dl>
      <LogoutButton />
    </div>
  );
}
