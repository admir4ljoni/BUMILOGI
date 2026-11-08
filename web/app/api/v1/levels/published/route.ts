import { and, asc, desc, eq, isNotNull, lte } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions, levels } from "@/lib/db/schema";
import { dateInIndonesia } from "@/lib/teacher";

// Levels teachers can assign: published on or before today (Indonesian time), newest first.
export async function GET(request: Request) {
  const { error } = await requireUser(request);
  if (error) return error;

  const rows = await db
    .select({
      id: levels.id,
      title: levels.title,
      hint: levels.hint,
      start_x: levels.start_x,
      start_y: levels.start_y,
      target_x: levels.target_x,
      target_y: levels.target_y,
      obstacles: levels.obstacles,
      optimal_tiles: levels.optimal_tiles,
      solution: levels.solution,
      published_at: levels.published_at,
      edition_name: editions.name,
      color: editions.color,
    })
    .from(levels)
    .innerJoin(editions, eq(levels.edition_id, editions.id))
    .where(and(isNotNull(levels.published_at), lte(levels.published_at, dateInIndonesia(new Date()))))
    .orderBy(desc(levels.published_at), asc(levels.sort_order), asc(levels.id));
  return Response.json(rows);
}
