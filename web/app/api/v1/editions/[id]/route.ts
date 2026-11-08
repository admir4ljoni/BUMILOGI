import { del } from "@vercel/blob";
import { count, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions, levels } from "@/lib/db/schema";
import { isUniqueViolation, parseEdition } from "@/lib/editions";

const notFound = () => Response.json({ error: "Edisi tidak ditemukan." }, { status: 404 });

async function findEdition(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  return edition ?? null;
}

// The edition row is already saved or deleted when this runs, so a failure here only leaves an
// unused file in Blob; log it instead of failing the request.
async function deleteImage(url: string) {
  try {
    await del(url);
  } catch (e) {
    console.error("Could not delete old edition image", url, e);
  }
}

export async function PUT(request: Request, { params }: RouteContext<"/api/v1/editions/[id]">) {
  const { error } = await requireAdmin();
  if (error) return error;

  const old = await findEdition((await params).id);
  if (!old) return notFound();

  const parsed = parseEdition(await request.json().catch(() => null));
  if (parsed.error !== null) return Response.json({ error: parsed.error }, { status: 400 });

  let edition;
  try {
    [edition] = await db.update(editions).set(parsed.data).where(eq(editions.id, old.id)).returning();
  } catch (e) {
    if (isUniqueViolation(e)) return Response.json({ error: "Slug ini sudah dipakai edisi lain." }, { status: 400 });
    throw e;
  }
  revalidateTag("editions", { expire: 0 });

  // Delete the old image only after the new URL is saved, so the site never shows a missing image.
  if (old.image_url && old.image_url !== edition.image_url) await deleteImage(old.image_url);
  return Response.json(edition);
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/v1/editions/[id]">) {
  const { error } = await requireAdmin();
  if (error) return error;

  const edition = await findEdition((await params).id);
  if (!edition) return notFound();

  const [{ levelCount }] = await db.select({ levelCount: count() }).from(levels).where(eq(levels.edition_id, edition.id));
  if (levelCount > 0)
    return Response.json({ error: `Edisi ini masih punya ${levelCount} level. Pindahkan atau hapus levelnya dulu.` }, { status: 400 });

  await db.delete(editions).where(eq(editions.id, edition.id));
  revalidateTag("editions", { expire: 0 });
  if (edition.image_url) await deleteImage(edition.image_url);
  return new Response(null, { status: 204 });
}
