import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Verifikasi email — BUMILOGI" };

export default function VerifyEmailPage() {
  return (
    <>
      <p className="label auth-eyebrow">Verifikasi email</p>
      <h1 className="auth-title">Satu langkah lagi.</h1>
      <p className="auth-sub">Kami sedang memeriksa tautan dari emailmu. Setelah itu kamu langsung masuk.</p>
      <AuthForm
        endpoint="verify-email"
        fields={[]}
        submitLabel=""
        onSuccess="redirect"
        autoSubmit
        footer={
          <span>
            Tautan tidak berfungsi? <Link href="/register">Daftar ulang</Link> untuk mendapat tautan baru.
          </span>
        }
      />
    </>
  );
}
