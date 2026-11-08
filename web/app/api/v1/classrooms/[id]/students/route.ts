import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { findClassroom, notFound } from "@/lib/owned";
import { parseName } from "@/lib/teacher";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]/students">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  return Response.json(await db.select().from(students).where(eq(students.classroom_id, classroom.id)).orderBy(asc(students.name), asc(students.id)));
}

// First names only (PLAN.md "Children's data"); the app says so next to the field.
export async function POST(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]/students">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  const name = parseName(await request.json().catch(() => null), 40);
  if (!name) return Response.json({ error: "Nama panggilan anak wajib diisi (maks. 40 karakter)." }, { status: 400 });

  const [student] = await db.insert(students).values({ classroom_id: classroom.id, name }).returning();
  return Response.json(student, { status: 201 });
}
