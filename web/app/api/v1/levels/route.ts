import { asc, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions, levels } from "@/lib/db/schema";
import { parseLevel } from "@/lib/levels";

// `?on_site=true` is public (the virtual board's levels); everything else, drafts included, is admin only.
export async function GET(request: Request) {
  const onSite = new URL(request.url).searchParams.get("on_site") === "true";
  if (!onSite) {
    const { error } = await requireAdmin();
    if (error) return error;
  }
  const query = db.select().from(levels).orderBy(asc(levels.sort_order), asc(levels.id));
  return Response.json(onSite ? await query.where(eq(levels.on_site, true)) : await query);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = parseLevel(await request.json().catch(() => null));
  if (parsed.error !== null) return Response.json({ error: parsed.error }, { status: 400 });

  const [edition] = await db.select({ id: editions.id }).from(editions).where(eq(editions.id, parsed.data.edition_id));
  if (!edition) return Response.json({ error: "Edisi tidak ditemukan." }, { status: 400 });

  const [level] = await db.insert(levels).values(parsed.data).returning();
  revalidateTag("levels", { expire: 0 }); // regenerate the virtual board on its next visit
  return Response.json(level, { status: 201 });
}
