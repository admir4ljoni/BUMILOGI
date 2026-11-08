// Finds a teacher's own records. Each returns null both when the record doesn't exist and when it
// belongs to another teacher, so the API answers 404 either way and never reveals other teachers' data.
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { assignments, attempts, classrooms, students } from "./db/schema";
import { parseId } from "./teacher";

export const notFound = (error: string) => Response.json({ error }, { status: 404 });

export async function findClassroom(teacherId: string, idParam: unknown) {
  const id = parseId(idParam);
  if (!id) return null;
  const [row] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacher_id, teacherId)));
  return row ?? null;
}

export async function findStudent(teacherId: string, idParam: unknown) {
  const id = parseId(idParam);
  if (!id) return null;
  const [row] = await db
    .select({ id: students.id, name: students.name, classroom_id: students.classroom_id, created_at: students.created_at })
    .from(students)
    .innerJoin(classrooms, eq(students.classroom_id, classrooms.id))
    .where(and(eq(students.id, id), eq(classrooms.teacher_id, teacherId)));
  return row ?? null;
}

export async function findAssignment(teacherId: string, idParam: unknown) {
  const id = parseId(idParam);
  if (!id) return null;
  const [row] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .innerJoin(classrooms, eq(assignments.classroom_id, classrooms.id))
    .where(and(eq(assignments.id, id), eq(classrooms.teacher_id, teacherId)));
  return row ?? null;
}

export async function findAttempt(teacherId: string, idParam: unknown) {
  const id = parseId(idParam);
  if (!id) return null;
  const [row] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .innerJoin(students, eq(attempts.student_id, students.id))
    .innerJoin(classrooms, eq(students.classroom_id, classrooms.id))
    .where(and(eq(attempts.id, id), eq(classrooms.teacher_id, teacherId)));
  return row ?? null;
}
