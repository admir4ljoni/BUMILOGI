import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { findStudent, notFound } from "@/lib/owned";
import { parseName } from "@/lib/teacher";

export async function PUT(request: Request, { params }: RouteContext<"/api/v1/students/[id]">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const student = await findStudent(user.id, (await params).id);
  if (!student) return notFound("Anak tidak ditemukan.");

  const name = parseName(await request.json().catch(() => null), 40);
  if (!name) return Response.json({ error: "Nama panggilan anak wajib diisi (maks. 40 karakter)." }, { status: 400 });

  const [updated] = await db.update(students).set({ name }).where(eq(students.id, student.id)).returning();
  return Response.json(updated);
}

// Also deletes the child's attempts (PLAN.md "Children's data").
export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/students/[id]">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const student = await findStudent(user.id, (await params).id);
  if (!student) return notFound("Anak tidak ditemukan.");

  await db.delete(students).where(eq(students.id, student.id));
  return new Response(null, { status: 204 });
}
