import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Atur ulang kata sandi — BUMILOGI", robots: { index: false } };

// Teachers (from the app) and admins land here. Without a token it asks for the email to send the
// link to; the link from the email brings them back with `?token=` to choose a new password.
export default function ResetPasswordPage() {
  return (
    <section className="container admin-box">
      <h1>Atur ulang kata sandi</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </section>
  );
}
