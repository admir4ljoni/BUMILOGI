import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classrooms } from "@/lib/db/schema";
import { findClassroom, notFound } from "@/lib/owned";
import { parseName } from "@/lib/teacher";

export async function PUT(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  const name = parseName(await request.json().catch(() => null), 80);
  if (!name) return Response.json({ error: "Nama kelas wajib diisi (maks. 80 karakter)." }, { status: 400 });

  const [updated] = await db.update(classrooms).set({ name }).where(eq(classrooms.id, classroom.id)).returning();
  return Response.json(updated);
}

// Also deletes the classroom's students and all their attempts (the app asks for confirmation).
export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  await db.delete(classrooms).where(eq(classrooms.id, classroom.id));
  return new Response(null, { status: 204 });
}
