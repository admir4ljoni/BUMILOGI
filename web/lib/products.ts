// Shaped like the planned `GET /api/v1/products` response (see TASKS.md, task 6).
// ponytail: hardcoded catalog with placeholder prices and set contents; swap for
// api<Product[]>("/products") once the products table + endpoint exist.
export type Product = {
  slug: string;
  edition: "rimba" | "samudra";
  name: string;
  tagline: string;
  description: string;
  contents: string[];
  animals: string[];
  price_idr: number;
  image_url: string | null;
};

export const PRODUCTS: Product[] = [
  {
    slug: "set-rimba",
    edition: "rimba",
    name: "Set Rimba",
    tagline: "Hutan hujan tropis",
    description:
      "Pandu badak jawa dan orangutan menyusuri hutan hujan, satu perintah demi satu perintah. Anak menyusun keping perintah, lalu menjalankan tokoh satwa di papan untuk mencapai bintang.",
    contents: ["Papan koding 6×6", "24 keping perintah (maju, belok, ulangi)", "3 tokoh satwa Rimba", "12 kartu misi bertingkat", "Panduan bermain untuk guru & orang tua"],
    animals: ["Badak Jawa", "Orangutan", "Pohon hutan hujan"],
    price_idr: 150000,
    image_url: null,
  },
  {
    slug: "set-samudra",
    edition: "samudra",
    name: "Set Samudra",
    tagline: "Terumbu karang",
    description:
      "Arahkan ikan badut menjelajahi terumbu karang tanpa menabrak karang. Setiap misi melatih anak memecah masalah menjadi langkah-langkah kecil yang runtut.",
    contents: ["Papan koding 6×6", "24 keping perintah (maju, belok, ulangi)", "3 tokoh satwa Samudra", "12 kartu misi bertingkat", "Panduan bermain untuk guru & orang tua"],
    animals: ["Ikan badut", "Terumbu karang"],
    price_idr: 150000,
    image_url: null,
  },
];

export const EDITION_COLOR = { rimba: "--green", samudra: "--pink" } as const;

export function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
