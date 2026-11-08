// What the public pages read. Cached forever and prerendered at build time; an admin save
// will expire the tag so the pages regenerate (tasks 20–21).
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from ".";
import { editions, levels } from "./schema";

export async function getEditions() {
  "use cache";
  cacheLife("max");
  cacheTag("editions");
  return db.select().from(editions).orderBy(asc(editions.sort_order), asc(editions.id));
}

export async function getEdition(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("editions");
  const [edition] = await db.select().from(editions).where(eq(editions.slug, slug));
  return edition ?? null;
}

/** Levels shown on the virtual board, with their edition's name and color for the pawn and chip. */
export async function getSiteLevels() {
  "use cache";
  cacheLife("max");
  cacheTag("levels", "editions");
  return db
    .select({
      id: levels.id,
      title: levels.title,
      hint: levels.hint,
      start_x: levels.start_x,
      start_y: levels.start_y,
      target_x: levels.target_x,
      target_y: levels.target_y,
      obstacles: levels.obstacles,
      edition_name: editions.name,
      color: editions.color,
    })
    .from(levels)
    .innerJoin(editions, eq(levels.edition_id, editions.id))
    .where(eq(levels.on_site, true))
    .orderBy(asc(levels.sort_order), asc(levels.id));
}

export type SiteLevel = Awaited<ReturnType<typeof getSiteLevels>>[number];
