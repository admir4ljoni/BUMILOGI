import { expect, test } from "bun:test";
import { parseEdition } from "./editions";

const valid = {
  slug: "set-rimba",
  name: " Set Rimba ",
  tagline: "Hutan hujan tropis",
  description: "Pandu badak jawa.",
  contents: ["Papan koding 6×6"],
  animals: ["Badak Jawa"],
  price_idr: 250000,
  shopee_url: "https://shopee.co.id/bumilogi",
  image_url: "https://abc123.public.blob.vercel-storage.com/edisi/rimba-x1.png",
  color: "green",
  sort_order: 0,
};

test("accepts a valid edition and trims text", () => {
  const { data, error } = parseEdition(valid);
  expect(error).toBeNull();
  expect(data?.name).toBe("Set Rimba");
});

test("image is optional", () => {
  expect(parseEdition({ ...valid, image_url: null }).error).toBeNull();
});

test("rejects bad input", () => {
  expect(parseEdition(null).error).not.toBeNull();
  expect(parseEdition({ ...valid, slug: "Set Rimba" }).error).not.toBeNull();
  expect(parseEdition({ ...valid, price_idr: 0 }).error).not.toBeNull();
  expect(parseEdition({ ...valid, price_idr: "250000" }).error).not.toBeNull();
  expect(parseEdition({ ...valid, contents: [] }).error).not.toBeNull();
  expect(parseEdition({ ...valid, animals: ["ok", " "] }).error).not.toBeNull();
  expect(parseEdition({ ...valid, shopee_url: "javascript:alert(1)" }).error).not.toBeNull();
  expect(parseEdition({ ...valid, image_url: "https://evil.example.com/x.png" }).error).not.toBeNull();
  expect(parseEdition({ ...valid, color: "red" }).error).not.toBeNull();
  expect(parseEdition({ ...valid, color: "toString" }).error).not.toBeNull();
});
