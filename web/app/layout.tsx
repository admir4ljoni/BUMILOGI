import type { Metadata } from "next";
import { Lexend, Unbounded } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Unbounded: wide, chunky display that echoes the printed tiles. Lexend: body, built for reading fluency.
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"] });
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BUMILOGI — Belajar Koding, Tanpa Layar",
  description: "Mainan edukatif dari plastik daur ulang yang melatih logika anak 4–6 tahun lewat bermain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${unbounded.variable} ${lexend.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
