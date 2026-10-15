import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { api, type User } from "@/lib/api";
import { ClassroomManager } from "@/components/classroom-manager";

export const metadata: Metadata = { title: "Kelas & Keluarga — BUMILOGI" };

export default function ClassroomPage() {
  return (
    <Suspense fallback={<p className="muted">Memuat…</p>}>
      <SignedIn />
    </Suspense>
  );
}

async function SignedIn() {
  const me = await api<User>("/auth/me");
  if (me.status === 401) redirect("/login?next=/kelas");
  if (!me.data) throw new Error(me.message ?? "Gagal memuat akun");
  return <ClassroomManager />;
}
