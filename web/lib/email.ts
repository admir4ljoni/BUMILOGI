// The only email we send: the password-reset link, through Gmail SMTP with an app password.
import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(to: string, url: string) {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    // Local dev without a Gmail account: print the link so the flow can still be tried.
    console.error(`SMTP_USER/SMTP_PASS not set; reset link for ${to}: ${url}`);
    return;
  }

  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: SMTP_USER, pass: SMTP_PASS } });
  await transport.sendMail({
    from: `BUMILOGI <${SMTP_USER}>`,
    to,
    subject: "Atur ulang kata sandi BUMILOGI",
    text: [
      "Halo,",
      "",
      "Seseorang (semoga Anda) meminta untuk mengatur ulang kata sandi akun BUMILOGI ini.",
      "Buka tautan ini dalam 1 jam untuk membuat kata sandi baru:",
      "",
      url,
      "",
      "Kalau Anda tidak memintanya, abaikan email ini. Kata sandi Anda tidak berubah.",
    ].join("\n"),
  });
}
