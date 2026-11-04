import type { Metadata } from "next";
import { CodingBoard } from "@/components/coding-board";

export const metadata: Metadata = {
  title: "Papan Koding — BUMILOGI",
  description: "Coba papan koding virtual klik-klak: susun perintah Maju, Mundur, Belok dan Ulangi, lalu bawa satwa ke bintang.",
};

export default function BoardPage() {
  return (
    <div className="container board-page">
      <div className="section-head">
        <p className="label eyebrow" style={{ color: "var(--purple-deep)" }}>
          Papan Koding Virtual
        </p>
        <h1>Susun langkah, bawa satwa ke bintang.</h1>
        <p className="lead">
          Versi layar dari papan klik-klak. Pilih perintah untuk menyusun program, tekan Jalankan, lalu lihat apakah satwanya sampai tanpa menabrak rintangan.
        </p>
      </div>
      <CodingBoard />
    </div>
  );
}
