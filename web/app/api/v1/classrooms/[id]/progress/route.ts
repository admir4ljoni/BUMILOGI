import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, students } from "@/lib/db/schema";
import { findClassroom, notFound } from "@/lib/owned";
import { progress } from "@/lib/research";

// Chart data: each child's solved rate and efficiency (overall, first vs latest try, per day) and the class average.
export async function GET(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]/progress">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  const studentRows = await db
    .select({ id: students.id, name: students.name })
    .from(students)
    .where(eq(students.classroom_id, classroom.id))
    .orderBy(asc(students.name), asc(students.id));
  const attemptRows = await db
    .select({
      id: attempts.id,
      student_id: attempts.student_id,
      level_id: attempts.level_id,
      outcome: attempts.outcome,
      tiles_used: attempts.tiles_used,
      optimal_tiles: attempts.optimal_tiles,
      created_at: attempts.created_at,
    })
    .from(attempts)
    .innerJoin(students, eq(attempts.student_id, students.id))
    .where(eq(students.classroom_id, classroom.id));

  return Response.json(progress(studentRows, attemptRows));
}
