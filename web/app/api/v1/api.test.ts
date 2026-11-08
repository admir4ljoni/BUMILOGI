// API tests against the local Postgres (see .env.test): ownership (404 for other teachers' data),
// grading on the server, and level locking. Calls the route handlers directly with bearer tokens,
// the same way the teacher app does. Everything created here is deleted afterwards.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editions, levels, user } from "@/lib/db/schema";
import { dateInIndonesia } from "@/lib/teacher";
import * as assignmentRoute from "./assignments/[id]/route";
import * as attemptRoute from "./attempts/[id]/route";
import * as attemptsRoute from "./attempts/route";
import * as classroomAssignments from "./classrooms/[id]/assignments/route";
import * as classroomExport from "./classrooms/[id]/export.csv/route";
import * as classroomProgress from "./classrooms/[id]/progress/route";
import * as classroomRoute from "./classrooms/[id]/route";
import * as classroomStudents from "./classrooms/[id]/students/route";
import * as classroomsRoute from "./classrooms/route";
import * as levelRoute from "./levels/[id]/route";
import * as publishedRoute from "./levels/published/route";
import * as studentAttempts from "./students/[id]/attempts/route";
import * as studentRoute from "./students/[id]/route";

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

/** Calls a route handler like an HTTP request would, and returns the status and parsed body. */
async function call(handler: unknown, token: string | null, options: { id?: number | string; body?: unknown } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const request = new Request("http://localhost/api", {
    method: options.body === undefined ? "GET" : "POST", // handlers don't look at the method
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await (handler as Handler)(request, { params: Promise.resolve({ id: String(options.id ?? "") }) });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

const run = crypto.randomUUID().slice(0, 8);
const userIds: string[] = [];
let editionId = 0;
let alice = "";
let bob = "";
let admin = "";
let published = { id: 0 };
let draft = { id: 0 };
let future = { id: 0 };

async function signUp(name: string) {
  const result = await auth.api.signUpEmail({ body: { name, email: `test-${name}-${run}@example.com`, password: "test-pass-123" } });
  userIds.push(result.user.id);
  return result;
}

// Start (0,2), star (2,0), obstacle (1,1): shortest route is 4 tiles.
const layout = { start_x: 0, start_y: 2, target_x: 2, target_y: 0, obstacles: [[1, 1]] as [number, number][], optimal_tiles: 4, solution: ["atas", "atas", "kanan", "kanan"] as const };

beforeAll(async () => {
  alice = (await signUp("alice")).token!;
  bob = (await signUp("bob")).token!;
  const adminUser = await signUp("admin");
  admin = adminUser.token!;
  await db.update(user).set({ role: "admin" }).where(eq(user.id, adminUser.user.id));

  const [edition] = await db
    .insert(editions)
    .values({ slug: `test-${run}`, name: "Test", tagline: "t", description: "d", contents: ["c"], animals: ["a"], price_idr: 1, shopee_url: "https://shopee.co.id", color: "green" })
    .returning();
  editionId = edition.id;
  const yesterday = dateInIndonesia(new Date(Date.now() - 86_400_000));
  const tomorrow = dateInIndonesia(new Date(Date.now() + 86_400_000));
  [published, draft, future] = await db
    .insert(levels)
    .values([
      { ...layout, solution: [...layout.solution], edition_id: editionId, title: "Published", hint: "h", published_at: yesterday },
      { ...layout, solution: [...layout.solution], edition_id: editionId, title: "Draft", hint: "h", published_at: null },
      { ...layout, solution: [...layout.solution], edition_id: editionId, title: "Future", hint: "h", published_at: tomorrow },
    ])
    .returning();
});

afterAll(async () => {
  // Deleting the users deletes their classrooms, students, assignments and attempts.
  await db.delete(user).where(inArray(user.id, userIds));
  await db.delete(levels).where(eq(levels.edition_id, editionId));
  await db.delete(editions).where(eq(editions.id, editionId));
});

test("teacher API needs a login", async () => {
  expect((await call(classroomsRoute.GET, null)).status).toBe(401);
  expect((await call(classroomsRoute.GET, "not-a-token")).status).toBe(401);
});

test("published levels: only from today or earlier", async () => {
  const { status, body } = await call(publishedRoute.GET, alice);
  expect(status).toBe(200);
  const ids = body.map((l: { id: number }) => l.id);
  expect(ids).toContain(published.id);
  expect(ids).not.toContain(draft.id);
  expect(ids).not.toContain(future.id);
});

test("the whole teacher flow, and other teachers get 404 everywhere", async () => {
  // Classroom
  const classroom = (await call(classroomsRoute.POST, alice, { body: { name: "  TK Melati  " } })).body;
  expect(classroom.name).toBe("TK Melati");
  expect((await call(classroomsRoute.POST, alice, { body: { name: " " } })).status).toBe(400);
  expect((await call(classroomsRoute.GET, bob)).body).toEqual([]);
  expect((await call(classroomRoute.PUT, bob, { id: classroom.id, body: { name: "Mine" } })).status).toBe(404);
  expect((await call(classroomRoute.DELETE, bob, { id: classroom.id })).status).toBe(404);
  expect((await call(classroomRoute.PUT, alice, { id: classroom.id, body: { name: "TK Melati B" } })).body.name).toBe("TK Melati B");

  // Students
  const ani = (await call(classroomStudents.POST, alice, { id: classroom.id, body: { name: "Ani" } })).body;
  expect((await call(classroomStudents.POST, bob, { id: classroom.id, body: { name: "Eve" } })).status).toBe(404);
  expect((await call(classroomStudents.GET, bob, { id: classroom.id })).status).toBe(404);
  expect((await call(studentRoute.PUT, bob, { id: ani.id, body: { name: "X" } })).status).toBe(404);
  expect((await call(studentRoute.DELETE, bob, { id: ani.id })).status).toBe(404);
  expect((await call(classroomsRoute.GET, alice)).body[0].student_count).toBe(1);

  // Assignments: published levels only, once per classroom
  expect((await call(classroomAssignments.POST, alice, { id: classroom.id, body: { level_id: draft.id } })).status).toBe(404);
  expect((await call(classroomAssignments.POST, alice, { id: classroom.id, body: { level_id: future.id } })).status).toBe(404);
  expect((await call(classroomAssignments.POST, bob, { id: classroom.id, body: { level_id: published.id } })).status).toBe(404);
  const assignment = await call(classroomAssignments.POST, alice, { id: classroom.id, body: { level_id: published.id } });
  expect(assignment.status).toBe(201);
  expect((await call(classroomAssignments.POST, alice, { id: classroom.id, body: { level_id: published.id } })).status).toBe(400);
  const assigned = (await call(classroomAssignments.GET, alice, { id: classroom.id })).body;
  expect(assigned).toHaveLength(1);
  expect(assigned[0]).toMatchObject({ level_id: published.id, start_x: 0, obstacles: [[1, 1]] });

  // Attempts: the server grades; anything the app says about the result is ignored
  const attempt = (body: object, token = alice) => call(attemptsRoute.POST, token, { body: { student_id: ani.id, level_id: published.id, ...body } });
  const crash = await attempt({ program: ["atas", "kanan"], outcome: "success", is_optimal: true });
  expect(crash.status).toBe(201);
  expect(crash.body).toMatchObject({ outcome: "collision", is_optimal: false, tiles_used: 2, optimal_tiles: 4, collision_at: 1 });
  expect(crash.body.steps).toHaveLength(1);
  const long = await attempt({ program: ["kanan", "kanan", "kanan", "atas", "atas", "kiri"] });
  expect(long.body).toMatchObject({ outcome: "success", is_optimal: false, tiles_used: 6 });
  const best = await attempt({ program: ["kanan", "kanan", "atas", "atas"] }); // not solve()'s route, still optimal
  expect(best.body).toMatchObject({ outcome: "success", is_optimal: true });
  expect((await attempt({ program: [] })).status).toBe(400);
  expect((await attempt({ program: Array(19).fill("atas") })).status).toBe(400);
  expect((await attempt({ program: ["atas"], level_id: draft.id })).status).toBe(404); // not assigned
  expect((await attempt({ program: ["atas"] }, bob)).status).toBe(404); // not bob's student

  // History, progress, CSV
  expect((await call(studentAttempts.GET, bob, { id: ani.id })).status).toBe(404);
  const history = (await call(studentAttempts.GET, alice, { id: ani.id })).body;
  expect(history.map((a: { outcome: string }) => a.outcome)).toEqual(["success", "success", "collision"]); // newest first
  const progress = (await call(classroomProgress.GET, alice, { id: classroom.id })).body;
  expect(progress.students[0].overall).toEqual({ attempts: 3, solved_rate: 2 / 3, efficiency: (4 / 6 + 1) / 2 });
  expect(progress.students[0].first.solved_rate).toBe(0);
  expect(progress.students[0].latest.solved_rate).toBe(1);
  expect((await call(classroomProgress.GET, bob, { id: classroom.id })).status).toBe(404);
  const csv = await call(classroomExport.GET, alice, { id: classroom.id });
  expect(csv.status).toBe(200);
  const lines = String(csv.body).trim().split("\r\n");
  expect(lines).toHaveLength(4);
  expect(lines[3]).toContain('"Ani","Published",3,');
  expect((await call(classroomExport.GET, bob, { id: classroom.id })).status).toBe(404);

  // Level locking: attempts exist, so the layout can't change and the level can't be deleted
  const levelBody = { ...layout, edition_id: editionId, title: "Published", hint: "h", published_at: null, on_site: false, sort_order: 0, obstacles: [[1, 0]] };
  expect((await call(levelRoute.PUT, alice, { id: published.id, body: levelBody })).status).toBe(403);
  const locked = await call(levelRoute.PUT, admin, { id: published.id, body: levelBody });
  expect(locked.status).toBe(400);
  expect(locked.body.error).toContain("terkunci");
  expect((await call(levelRoute.DELETE, admin, { id: published.id })).status).toBe(400);

  // Deleting a wrong entry, an assignment, a student (and their attempts)
  expect((await call(attemptRoute.DELETE, bob, { id: crash.body.id })).status).toBe(404);
  expect((await call(attemptRoute.DELETE, alice, { id: crash.body.id })).status).toBe(204);
  expect((await call(attemptRoute.DELETE, alice, { id: crash.body.id })).status).toBe(404);
  expect((await call(assignmentRoute.DELETE, bob, { id: assignment.body.id })).status).toBe(404);
  expect((await call(assignmentRoute.DELETE, alice, { id: assignment.body.id })).status).toBe(204);
  expect((await call(studentAttempts.GET, alice, { id: ani.id })).body).toHaveLength(2); // attempts outlive the assignment
  expect((await call(studentRoute.DELETE, alice, { id: ani.id })).status).toBe(204);
  expect((await call(studentAttempts.GET, alice, { id: ani.id })).status).toBe(404);
  expect((await call(classroomProgress.GET, alice, { id: classroom.id })).body.class.overall.attempts).toBe(0);
  expect((await call(classroomRoute.DELETE, alice, { id: classroom.id })).status).toBe(204);
  expect((await call(classroomsRoute.GET, alice)).body).toEqual([]);
});

test("bad ids are 404, not errors", async () => {
  for (const id of ["abc", "0", "-1", "1.5", "99999999999"]) expect((await call(classroomRoute.PUT, alice, { id, body: { name: "x" } })).status).toBe(404);
});
