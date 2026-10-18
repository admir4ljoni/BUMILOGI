import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { api, type User } from "@/lib/api";
import type { Product } from "@/lib/products";
import { PreorderForm } from "@/components/preorder-form";

export const metadata: Metadata = { title: "Pre-order — BUMILOGI" };

export default function PreorderPage({ searchParams }: PageProps<"/preorder">) {
  return (
    <Suspense fallback={<p className="muted">Memuat…</p>}>
      {searchParams.then(({ produk, qty }) => (
        <Checkout slug={String(produk ?? "")} qty={Number(qty) || 1} />
      ))}
    </Suspense>
  );
}

async function Checkout({ slug, qty }: { slug: string; qty: number }) {
  const [me, product] = await Promise.all([api<User>("/auth/me"), api<Product>("/products/" + encodeURIComponent(slug))]);
  if (me.status === 401) redirect("/login?next=" + encodeURIComponent(`/preorder?produk=${slug}&qty=${qty}`));
  if (!me.data) throw new Error(me.message ?? "Gagal memuat akun");
  if (!product.data) notFound();
  return <PreorderForm product={product.data} user={me.data} qty={Math.min(100, Math.max(1, qty))} />;
}
