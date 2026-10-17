// `GET /api/v1/products` item (api/products.go).
export type Product = {
  id: string;
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

export const EDITION_COLOR = { rimba: "--green", samudra: "--pink" } as const;

export function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
