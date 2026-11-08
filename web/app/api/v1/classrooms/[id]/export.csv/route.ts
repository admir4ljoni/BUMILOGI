import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, classrooms, levels, students } from "@/lib/db/schema";
import { findClassroom, notFound } from "@/lib/owned";
import { attemptsCsv } from "@/lib/research";
import { dateInIndonesia } from "@/lib/teacher";

// Every attempt in the classroom, for the research. Teachers export after each session: it's the backup that matters.
export async function GET(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]/export.csv">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  const rows = await db
    .select({
      id: attempts.id,
      student_id: attempts.student_id,
      level_id: attempts.level_id,
      classroom: classrooms.name,
      student: students.name,
      level: levels.title,
      program: attempts.program,
      tiles_used: attempts.tiles_used,
      optimal_tiles: attempts.optimal_tiles,
      outcome: attempts.outcome,
      is_optimal: attempts.is_optimal,
      created_at: attempts.created_at,
    })
    .from(attempts)
    .innerJoin(students, eq(attempts.student_id, students.id))
    .innerJoin(classrooms, eq(students.classroom_id, classrooms.id))
    .innerJoin(levels, eq(attempts.level_id, levels.id))
    .where(eq(classrooms.id, classroom.id));

  const filename = `bumilogi-kelas-${classroom.id}-${dateInIndonesia(new Date())}.csv`;
  // The BOM makes Excel read the file as UTF-8, so names with accents show correctly.
  return new Response("﻿" + attemptsCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` },
  });
}
