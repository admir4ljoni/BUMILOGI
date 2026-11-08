import { asc, count, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { classrooms, students } from "@/lib/db/schema";
import { parseName } from "@/lib/teacher";

export async function GET(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const rows = await db
    .select({ id: classrooms.id, name: classrooms.name, created_at: classrooms.created_at, student_count: count(students.id) })
    .from(classrooms)
    .leftJoin(students, eq(students.classroom_id, classrooms.id))
    .where(eq(classrooms.teacher_id, user.id))
    .groupBy(classrooms.id)
    .orderBy(asc(classrooms.created_at), asc(classrooms.id));
  return Response.json(rows);
}

export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const name = parseName(await request.json().catch(() => null), 80);
  if (!name) return Response.json({ error: "Nama kelas wajib diisi (maks. 80 karakter)." }, { status: 400 });

  const [classroom] = await db.insert(classrooms).values({ teacher_id: user.id, name }).returning();
  return Response.json(classroom, { status: 201 });
}
