// Catalog is static: sales happen on Shopee, so there's no backend to read it from.
// Prices are shown for information only; Shopee is the source of truth at checkout.

// ponytail: placeholder store link; replace with the real BUMILOGI Shopee shop/listing URLs.
export const SHOPEE_URL = "https://shopee.co.id/";

export type Product = {
  slug: string;
  edition: "rimba" | "samudra";
  name: string;
  tagline: string;
  description: string;
  contents: string[];
  animals: string[];
  price_idr: number;
  shopee_url: string;
};

export const PRODUCTS: Product[] = [
  {
    slug: "set-rimba",
    edition: "rimba",
    name: "Set Rimba",
    tagline: "Hutan hujan tropis",
    description:
      "Pandu badak jawa dan orangutan menyusuri hutan hujan, satu perintah demi satu perintah. Anak menyusun keping perintah, lalu menjalankan tokoh satwa di papan untuk mencapai bintang.",
    contents: [
      "Papan koding 6×6",
      "26 keping panah (diputar untuk atas, bawah, kiri, kanan)",
      "3 tokoh satwa Rimba",
      "12 kartu misi bertingkat",
      "Panduan bermain untuk guru & orang tua",
    ],
    animals: ["Badak Jawa", "Orangutan", "Pohon hutan hujan"],
    price_idr: 250000,
    shopee_url: SHOPEE_URL,
  },
  {
    slug: "set-samudra",
    edition: "samudra",
    name: "Set Samudra",
    tagline: "Terumbu karang",
    description:
      "Arahkan ikan badut menjelajahi terumbu karang tanpa menabrak karang. Setiap misi melatih anak memecah masalah menjadi langkah-langkah kecil yang runtut.",
    contents: [
      "Papan koding 6×6",
      "26 keping panah (diputar untuk atas, bawah, kiri, kanan)",
      "3 tokoh satwa Samudra",
      "12 kartu misi bertingkat",
      "Panduan bermain untuk guru & orang tua",
    ],
    animals: ["Ikan badut", "Terumbu karang"],
    price_idr: 250000,
    shopee_url: SHOPEE_URL,
  },
];

export const product = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const EDITION_COLOR = { rimba: "--green", samudra: "--blue" } as const;

export function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
