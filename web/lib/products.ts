// Editions now live in the database (lib/db/site.ts). This file keeps the shop-wide bits.

// ponytail: placeholder store link for the header, footer and hero; replace with the real BUMILOGI
// Shopee shop URL. Each edition's own listing link is in the database (editable from task 20).
export const SHOPEE_URL = "https://shopee.co.id/";

export function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
