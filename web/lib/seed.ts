// `bun run db:seed`: fills an empty database with the two editions and the six starter levels
// that used to be constants in the code. Does nothing if editions already exist, so it is safe
// to run again, also in production.
// `bun run db:seed -- --admin <email>` also makes that user an admin (creating the account if needed).
import { generateRandomString, hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { MAX_TILES, solve, type Layout } from "./board";
import { client, db } from "./db";
import { account, editions, levels, user } from "./db/schema";
import { SHOPEE_URL } from "./products"; // placeholder; the admin sets real listing URLs (task 20)

const EDITIONS = [
  {
    slug: "set-rimba",
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
    color: "green",
    sort_order: 0,
  },
  {
    slug: "set-samudra",
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
    color: "blue",
    sort_order: 1,
  },
];

type SeedLevel = Layout & { edition: string; title: string; hint: string };

const LEVELS: SeedLevel[] = [
  { edition: "set-rimba", title: "Ke kanan menuju bintang", hint: "Tekan Kanan sampai badak tiba di bintang.", start_x: 1, start_y: 3, target_x: 4, target_y: 3, obstacles: [] },
  { edition: "set-samudra", title: "Naik ke atas", hint: "Bintangnya ada di atas ikan badut. Coba tekan Atas!", start_x: 2, start_y: 5, target_x: 2, target_y: 1, obstacles: [] },
  { edition: "set-rimba", title: "Lewat tikungan", hint: "Naik dulu, lalu ke kanan.", start_x: 1, start_y: 4, target_x: 4, target_y: 1, obstacles: [[2, 4], [2, 3], [2, 2]] },
  { edition: "set-samudra", title: "Awas karang!", hint: "Ada karang di jalan. Cari jalan memutar.", start_x: 0, start_y: 3, target_x: 5, target_y: 3, obstacles: [[2, 3], [3, 3]] },
  { edition: "set-rimba", title: "Naik tangga", hint: "Seperti naik tangga: Atas, lalu Kanan, begitu terus.", start_x: 0, start_y: 5, target_x: 3, target_y: 2, obstacles: [[0, 3], [1, 2], [2, 1]] },
  {
    edition: "set-samudra",
    title: "Menyelam ke dasar",
    hint: "Jalan zig-zag sampai pojok bawah. Hitung langkahnya!",
    start_x: 0,
    start_y: 0,
    target_x: 5,
    target_y: 5,
    obstacles: [[3, 0], [5, 1], [0, 2], [0, 5], [2, 5], [5, 3]],
  },
];

async function seedContent() {
  const existing = await db.select({ id: editions.id }).from(editions).limit(1);
  if (existing.length > 0) {
    console.log("Editions already exist; skipping editions and levels.");
    return;
  }

  await db.transaction(async (tx) => {
    const inserted = await tx.insert(editions).values(EDITIONS).returning({ id: editions.id, slug: editions.slug });
    const editionId = Object.fromEntries(inserted.map((e) => [e.slug, e.id]));

    const rows = LEVELS.map(({ edition, ...level }, i) => {
      const solution = solve(level);
      // Same rule the level API will enforce: reachable within the 18 slots of the physical board.
      if (!solution || solution.length > MAX_TILES) throw new Error(`Level "${level.title}" has no solution within ${MAX_TILES} tiles`);
      return { ...level, edition_id: editionId[edition], optimal_tiles: solution.length, solution, on_site: true, sort_order: i };
    });
    await tx.insert(levels).values(rows);
  });
  console.log(`Seeded ${EDITIONS.length} editions and ${LEVELS.length} levels.`);
}

async function seedAdmin(email: string) {
  const [existing] = await db.update(user).set({ role: "admin" }).where(eq(user.email, email)).returning({ id: user.id });
  if (existing) {
    console.log(`${email} is now an admin (password unchanged).`);
    return;
  }

  // Same rows Better Auth writes on email sign-up: a user plus a 'credential' account holding the hash.
  const password = generateRandomString(16, "a-z", "A-Z", "0-9");
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, name: email.split("@")[0], email, emailVerified: true, role: "admin" });
    await tx.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
  });
  console.log(`Created admin ${email} with password: ${password}`);
  console.log("Save it now; it is not shown again.");
}

await seedContent();

const adminFlag = process.argv.indexOf("--admin");
if (adminFlag !== -1) {
  const email = process.argv[adminFlag + 1]?.trim().toLowerCase(); // Better Auth stores emails lowercase
  if (!email || !email.includes("@")) {
    console.error("Usage: bun run db:seed -- --admin <email>");
    process.exitCode = 1;
  } else {
    await seedAdmin(email);
  }
}
await client.end();
