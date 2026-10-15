import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Masuk — BUMILOGI" };

export default function LoginPage() {
  return (
    <>
      <p className="label auth-eyebrow">Masuk</p>
      <h1 className="auth-title">Selamat datang kembali.</h1>
      <p className="auth-sub">Masuk untuk melanjutkan pre-order dan memantau progres belajar anak.</p>
      <AuthForm
        endpoint="login"
        fields={["email", "password"]}
        submitLabel="Masuk"
        onSuccess="redirect"
        footer={
          <>
            <Link href="/forgot-password">Lupa kata sandi?</Link>
            <span>
              Belum punya akun? <Link href="/register">Daftar</Link>
            </span>
          </>
        }
      />
    </>
  );
}
