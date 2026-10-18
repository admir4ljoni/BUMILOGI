import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { api, type User } from "@/lib/api";
import type { Payment } from "@/lib/orders";
import { PaymentSettingsForm } from "@/components/payment-settings-form";

export const metadata: Metadata = { title: "Pengaturan pembayaran — BUMILOGI" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="muted">Memuat…</p>}>
      <Settings />
    </Suspense>
  );
}

// Non-managers get a 404 so the admin area isn't advertised; Go enforces the role anyway.
async function Settings() {
  const me = await api<User>("/auth/me");
  if (me.status === 401) redirect("/login?next=/admin/pengaturan");
  if (me.data?.role !== "manager") notFound();
  const s = await api<Payment | null>("/admin/settings/payment");
  if (s.status !== 200) throw new Error(s.message ?? "Gagal memuat pengaturan");
  return <PaymentSettingsForm initial={s.data ?? null} />;
}
