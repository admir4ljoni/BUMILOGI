"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/v1/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
