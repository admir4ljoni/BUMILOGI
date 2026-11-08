import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk Admin — BUMILOGI", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <section className="container admin-box">
      <Logo />
      <h1>Masuk Admin</h1>
      <LoginForm />
    </section>
  );
}
