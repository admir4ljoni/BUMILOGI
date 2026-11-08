import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts } from "@/lib/db/schema";
import { findAttempt, notFound } from "@/lib/owned";

// For an answer entered by mistake.
export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/attempts/[id]">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const attempt = await findAttempt(user.id, (await params).id);
  if (!attempt) return notFound("Jawaban tidak ditemukan.");

  await db.delete(attempts).where(eq(attempts.id, attempt.id));
  return new Response(null, { status: 204 });
}
