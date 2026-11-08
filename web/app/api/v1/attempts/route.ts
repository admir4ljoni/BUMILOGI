import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments, attempts, levels } from "@/lib/db/schema";
import { findStudent, notFound } from "@/lib/owned";
import { grade, parseId, parseProgram } from "@/lib/teacher";

// The app sends only the child's program; the server runs it on the level and stores the verdict.
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;

  const body = (await request.json().catch(() => null)) as { student_id?: unknown; level_id?: unknown; program?: unknown } | null;
  const student = await findStudent(user.id, body?.student_id);
  if (!student) return notFound("Anak tidak ditemukan.");

  const program = parseProgram(body?.program);
  if (!program) return Response.json({ error: "Program harus berisi 1–18 keping: atas, bawah, kiri, atau kanan." }, { status: 400 });

  const levelId = parseId(body?.level_id);
  if (!levelId) return Response.json({ error: "Pilih levelnya." }, { status: 400 });

  // The level must be one the child's classroom was given.
  const [level] = await db
    .select({
      id: levels.id,
      start_x: levels.start_x,
      start_y: levels.start_y,
      target_x: levels.target_x,
      target_y: levels.target_y,
      obstacles: levels.obstacles,
      optimal_tiles: levels.optimal_tiles,
    })
    .from(levels)
    .innerJoin(assignments, and(eq(assignments.level_id, levels.id), eq(assignments.classroom_id, student.classroom_id)))
    .where(eq(levels.id, levelId));
  if (!level) return notFound("Level ini belum diberikan ke kelas anak ini.");

  const { result, ...verdict } = grade(level, program);
  const [attempt] = await db.insert(attempts).values({ student_id: student.id, level_id: level.id, program, ...verdict }).returning();
  return Response.json({ ...attempt, steps: result.steps, collision_at: result.outcome === "collision" ? result.at : null }, { status: 201 });
}
