// The only email we send: the password-reset link, through Gmail SMTP with an app password.
import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(to: string, url: string) {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    // Local dev without a Gmail account: print the link so the flow can still be tried.
    console.error(`SMTP_USER/SMTP_PASS not set; reset link for ${to}: ${url}`);
    return;
  }

  // Short timeouts: nodemailer waits up to 2 minutes by default, which left the form stuck on
  // "Mengirim…" on networks that block SMTP.
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
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
  } catch (error) {
    // Better Auth answers "sent" either way (so the form doesn't reveal which emails have accounts);
    // the failure only shows up here, in the server log.
    console.error("Reset email failed", error);
    // Local dev on a network that blocks SMTP (some ISPs and campus Wi-Fi): print the link so the flow still works.
    if (process.env.NODE_ENV === "development") console.error(`Reset link for ${to}: ${url}`);
  }
}
