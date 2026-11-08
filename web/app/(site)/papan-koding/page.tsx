import type { Metadata } from "next";
import { CodingBoard } from "@/components/coding-board";
import { getSiteLevels } from "@/lib/db/site";

export const metadata: Metadata = {
  title: "Papan Koding — BUMILOGI",
  description: "Coba papan koding virtual klik-klak: susun keping arah Atas, Bawah, Kiri, dan Kanan, lalu bawa satwa ke bintang.",
};

export default async function BoardPage() {
  const levels = await getSiteLevels();
  if (levels.length === 0) {
    return (
      <div className="container board-page">
        <h1>Papan koding</h1>
        <p className="lead">Belum ada misi. Coba lagi nanti, ya.</p>
      </div>
    );
  }

  return (
    <div className="container board-page">
      <CodingBoard
        levels={levels}
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
