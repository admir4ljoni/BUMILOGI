// `GET /api/v1/preorders/:id` (api/orders.go).
export type Payment = { bank_name: string; account_number: string; account_holder: string; whatsapp: string };

export type Order = {
  id: string;
  order_code: string;
  product_name: string;
  product_slug: string;
  edition: "rimba" | "samudra";
  unit_price_idr: number;
  quantity: number;
  unique_code: number;
  total_idr: number;
  recipient_name: string;
  phone: string;
  address_text: string;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  status: "pending_payment" | "confirmed" | "shipped" | "cancelled";
  created_at: string;
  payment: Payment | null; // null until a manager sets the bank details
  whatsapp_url: string | null;
};

export const STATUS = {
  pending_payment: { label: "Menunggu pembayaran", color: "--yellow" },
  confirmed: { label: "Terverifikasi", color: "--green" },
  shipped: { label: "Dikirim", color: "--purple" },
  cancelled: { label: "Dibatalkan", color: "--sand" },
} as const;
