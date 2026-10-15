import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Daftar — BUMILOGI" };

export default function RegisterPage() {
  return (
    <>
      <p className="label auth-eyebrow">Daftar</p>
      <h1 className="auth-title">Mulai petualangan koding.</h1>
      <p className="auth-sub">Buat akun untuk pre-order dan mencatat progres anak, di kelas maupun di rumah.</p>
      <AuthForm
        endpoint="register"
        fields={["name", "email", "phone", "newPassword"]}
        submitLabel="Buat akun"
        onSuccess="message"
        footer={
          <span>
            Sudah punya akun? <Link href="/login">Masuk</Link>
          </span>
        }
      />
    </>
  );
}
