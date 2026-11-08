import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";
import { isUniqueViolation, parseEdition } from "@/lib/editions";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = parseEdition(await request.json().catch(() => null));
  if (parsed.error !== null) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const [edition] = await db.insert(editions).values(parsed.data).returning();
    revalidateTag("editions", { expire: 0 }); // regenerate the public pages on their next visit
    return Response.json(edition, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return Response.json({ error: "Slug ini sudah dipakai edisi lain." }, { status: 400 });
    throw e;
  }
}
