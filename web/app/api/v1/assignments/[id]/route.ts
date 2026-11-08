import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments } from "@/lib/db/schema";
import { findAssignment, notFound } from "@/lib/owned";

// Removes the level from the classroom's list; attempts already made on it stay.
export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/assignments/[id]">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const assignment = await findAssignment(user.id, (await params).id);
  if (!assignment) return notFound("Penugasan tidak ditemukan.");

  await db.delete(assignments).where(eq(assignments.id, assignment.id));
  return new Response(null, { status: 204 });
}
