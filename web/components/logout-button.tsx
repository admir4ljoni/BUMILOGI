"use client";

import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/v1/auth/logout", { method: "POST" });
        location.replace("/login"); // full load drops every cached logged-in render (see auth-form)
      }}
    >
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
