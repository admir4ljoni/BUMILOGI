import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attempts, levels } from "@/lib/db/schema";
import { findStudent, notFound } from "@/lib/owned";

// A child's attempt history, newest first.
export async function GET(request: Request, { params }: RouteContext<"/api/v1/students/[id]/attempts">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const student = await findStudent(user.id, (await params).id);
  if (!student) return notFound("Anak tidak ditemukan.");

  const rows = await db
    .select({
      id: attempts.id,
      level_id: attempts.level_id,
      level_title: levels.title,
      program: attempts.program,
      tiles_used: attempts.tiles_used,
      optimal_tiles: attempts.optimal_tiles,
      outcome: attempts.outcome,
      is_optimal: attempts.is_optimal,
      created_at: attempts.created_at,
    })
    .from(attempts)
    .innerJoin(levels, eq(attempts.level_id, levels.id))
    .where(eq(attempts.student_id, student.id))
    .orderBy(desc(attempts.created_at), desc(attempts.id));
  return Response.json(rows);
}
