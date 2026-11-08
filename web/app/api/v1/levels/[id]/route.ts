import { count, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, editions, levels } from "@/lib/db/schema";
import { parseLevel, sameLayout } from "@/lib/levels";

const notFound = () => Response.json({ error: "Level tidak ditemukan." }, { status: 404 });

async function findLevel(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [level] = await db.select().from(levels).where(eq(levels.id, id));
  return level ?? null;
}

async function countAttempts(levelId: number) {
  const [{ attemptCount }] = await db.select({ attemptCount: count() }).from(attempts).where(eq(attempts.level_id, levelId));
  return attemptCount;
}

export async function PUT(request: Request, { params }: RouteContext<"/api/v1/levels/[id]">) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const old = await findLevel((await params).id);
  if (!old) return notFound();

  const parsed = parseLevel(await request.json().catch(() => null));
  if (parsed.error !== null) return Response.json({ error: parsed.error }, { status: 400 });

  const [edition] = await db.select({ id: editions.id }).from(editions).where(eq(editions.id, parsed.data.edition_id));
  if (!edition) return Response.json({ error: "Edisi tidak ditemukan." }, { status: 400 });

  // Attempts point at this puzzle; changing its layout would make old research data meaningless.
  if (!sameLayout(old, parsed.data) && (await countAttempts(old.id)) > 0)
    return Response.json({ error: "Level ini sudah dimainkan, jadi papannya terkunci. Salin level untuk membuat versi baru." }, { status: 400 });

  const [level] = await db.update(levels).set(parsed.data).where(eq(levels.id, old.id)).returning();
  revalidateTag("levels", { expire: 0 });
  return Response.json(level);
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/levels/[id]">) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const level = await findLevel((await params).id);
  if (!level) return notFound();

  const attemptCount = await countAttempts(level.id);
  if (attemptCount > 0) return Response.json({ error: `Level ini sudah punya ${attemptCount} jawaban anak, jadi tidak bisa dihapus.` }, { status: 400 });

  await db.delete(levels).where(eq(levels.id, level.id)); // its assignments go with it (cascade)
  revalidateTag("levels", { expire: 0 });
  return new Response(null, { status: 204 });
}
