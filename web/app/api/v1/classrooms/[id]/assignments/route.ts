import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments, editions, levels } from "@/lib/db/schema";
import { isUniqueViolation } from "@/lib/editions";
import { findClassroom, notFound } from "@/lib/owned";
import { dateInIndonesia, parseId } from "@/lib/teacher";

// The classroom's levels, with their layout so the app can draw the board to set up.
export async function GET(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]/assignments">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  const rows = await db
    .select({
      id: assignments.id,
      level_id: levels.id,
      title: levels.title,
      hint: levels.hint,
      start_x: levels.start_x,
      start_y: levels.start_y,
      target_x: levels.target_x,
      target_y: levels.target_y,
      obstacles: levels.obstacles,
      optimal_tiles: levels.optimal_tiles,
      edition_name: editions.name,
      color: editions.color,
      created_at: assignments.created_at,
    })
    .from(assignments)
    .innerJoin(levels, eq(assignments.level_id, levels.id))
    .innerJoin(editions, eq(levels.edition_id, editions.id))
    .where(eq(assignments.classroom_id, classroom.id))
    .orderBy(asc(assignments.created_at), asc(assignments.id));
  return Response.json(rows);
}

export async function POST(request: Request, { params }: RouteContext<"/api/v1/classrooms/[id]/assignments">) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const classroom = await findClassroom(user.id, (await params).id);
  if (!classroom) return notFound("Kelas tidak ditemukan.");

  const body = (await request.json().catch(() => null)) as { level_id?: unknown } | null;
  const levelId = parseId(body?.level_id);
  if (!levelId) return Response.json({ error: "Pilih levelnya." }, { status: 400 });

  // Only published levels; drafts are still being edited by the admin.
  const [level] = await db
    .select({ id: levels.id })
    .from(levels)
    .where(and(eq(levels.id, levelId), isNotNull(levels.published_at), lte(levels.published_at, dateInIndonesia(new Date()))));
  if (!level) return notFound("Level tidak ditemukan.");

  try {
    const [assignment] = await db.insert(assignments).values({ classroom_id: classroom.id, level_id: level.id }).returning();
    return Response.json(assignment, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return Response.json({ error: "Level ini sudah diberikan ke kelas ini." }, { status: 400 });
    throw e;
  }
}
