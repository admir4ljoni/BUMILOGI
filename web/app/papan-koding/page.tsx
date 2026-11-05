import type { Metadata } from "next";
import { CodingBoard } from "@/components/coding-board";

export const metadata: Metadata = {
  title: "Papan Koding — BUMILOGI",
  description: "Coba papan koding virtual klik-klak: susun perintah Maju, Mundur, Belok dan Ulangi, lalu bawa satwa ke bintang.",
};

export default function BoardPage() {
  return (
    <div className="container board-page">
      <CodingBoard
        head={
          <>
            <h1>Susun langkah, bawa satwa ke bintang.</h1>
            <p className="lead">Versi layar dari papan klik-klak. Pilih perintah, tekan Jalankan Program, lalu lihat apakah satwanya sampai.</p>
          </>
        }
      />
    </div>
  );
}
