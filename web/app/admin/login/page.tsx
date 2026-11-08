import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk Admin — BUMILOGI", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <section className="container admin-box">
      <h1>Masuk Admin</h1>
      <LoginForm />
    </section>
  );
}
