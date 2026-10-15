import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Lupa kata sandi — BUMILOGI" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="label auth-eyebrow">Lupa kata sandi</p>
      <h1 className="auth-title">Tenang, kita atur ulang.</h1>
      <p className="auth-sub">Masukkan email akunmu. Kami kirimkan tautan untuk membuat kata sandi baru.</p>
      <AuthForm
        endpoint="forgot-password"
        fields={["email"]}
        submitLabel="Kirim tautan"
        onSuccess="message"
        footer={<Link href="/login">Kembali ke halaman masuk</Link>}
      />
    </>
  );
}
