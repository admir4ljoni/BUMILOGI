import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Kata sandi baru — BUMILOGI" };

export default function ResetPasswordPage() {
  return (
    <>
      <p className="label auth-eyebrow">Kata sandi baru</p>
      <h1 className="auth-title">Buat kata sandi baru.</h1>
      <p className="auth-sub">Setelah disimpan, kamu langsung masuk dan sesi di perangkat lain berakhir.</p>
      <AuthForm
        endpoint="reset-password"
        fields={["newPassword"]}
        submitLabel="Simpan kata sandi"
        onSuccess="redirect"
        footer={<Link href="/forgot-password">Tautan kedaluwarsa? Minta yang baru</Link>}
      />
    </>
  );
}
