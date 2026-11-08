// Research measures from PLAN.md "Research data": the classroom progress charts and the CSV export.
//   Solved:     outcome = 'success'
//   Efficiency: optimal_tiles / tiles_used, for solved attempts only (1 = shortest possible)
//   Progress:   each student's first attempt per level vs their latest; the class is the average of its students.
import type { Cmd } from "./board";
import { dateInIndonesia } from "./teacher";

export type ResearchAttempt = {
  id: number;
  student_id: number;
  level_id: number;
  outcome: string;
  tiles_used: number;
  optimal_tiles: number;
  created_at: Date;
};

type Summary = { attempts: number; solved_rate: number | null; efficiency: number | null };

const average = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function summarize(rows: ResearchAttempt[]): Summary {
  const solved = rows.filter((r) => r.outcome === "success");
  return {
    attempts: rows.length,
    solved_rate: rows.length > 0 ? solved.length / rows.length : null,
    efficiency: average(solved.map((r) => r.optimal_tiles / r.tiles_used)),
  };
}

// The class value is the plain average of the students who have a value (students without attempts don't count).
function averageOfStudents(summaries: Summary[]): Summary {
  const present = (key: "solved_rate" | "efficiency") => summaries.map((s) => s[key]).filter((v) => v !== null);
  return {
    attempts: summaries.reduce((sum, s) => sum + s.attempts, 0),
    solved_rate: average(present("solved_rate")),
    efficiency: average(present("efficiency")),
  };
}

const chronological = (a: ResearchAttempt, b: ResearchAttempt) => a.created_at.getTime() - b.created_at.getTime() || a.id - b.id;

/** First and latest attempt on each level. `rows` must be one student's attempts in chronological order. */
function firstAndLatest(rows: ResearchAttempt[]) {
  const first = new Map<number, ResearchAttempt>();
  const latest = new Map<number, ResearchAttempt>();
  for (const r of rows) {
    if (!first.has(r.level_id)) first.set(r.level_id, r);
    latest.set(r.level_id, r);
  }
  return { first: [...first.values()], latest: [...latest.values()] };
}

function byDay(rows: ResearchAttempt[]) {
  const days = new Map<string, ResearchAttempt[]>();
  for (const r of rows) {
    const day = dateInIndonesia(r.created_at);
    days.set(day, [...(days.get(day) ?? []), r]);
  }
  return days;
}

/** Chart data for one classroom: per student, plus the class average, overall and per day. */
export function progress(students: { id: number; name: string }[], attempts: ResearchAttempt[]) {
  const sorted = [...attempts].sort(chronological);

  const perStudent = students.map((student) => {
    const rows = sorted.filter((r) => r.student_id === student.id);
    const { first, latest } = firstAndLatest(rows);
    const days = byDay(rows);
    return {
      id: student.id,
      name: student.name,
      overall: summarize(rows),
      first: summarize(first),
      latest: summarize(latest),
      by_day: [...days].map(([date, dayRows]) => ({ date, ...summarize(dayRows) })),
    };
  });

  const allDays = [...new Set(perStudent.flatMap((s) => s.by_day.map((d) => d.date)))].sort();
  return {
    students: perStudent,
    class: {
      overall: averageOfStudents(perStudent.map((s) => s.overall)),
      first: averageOfStudents(perStudent.map((s) => s.first)),
      latest: averageOfStudents(perStudent.map((s) => s.latest)),
      by_day: allDays.map((date) => ({ date, ...averageOfStudents(perStudent.flatMap((s) => s.by_day.filter((d) => d.date === date))) })),
    },
  };
}

export type ExportRow = ResearchAttempt & { classroom: string; student: string; level: string; program: Cmd[]; is_optimal: boolean };

const CSV_COLUMNS = ["classroom", "student", "level", "attempt_no", "date", "program", "tiles_used", "optimal_tiles", "outcome", "is_optimal", "efficiency"];

// Quote every text cell, and put a ' before text a spreadsheet would run as a formula (=, +, -, @).
function csvText(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

// "2026-11-08 20:42" in Indonesian time, which spreadsheets read as a date.
function csvDate(when: Date) {
  return when.toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 16);
}

/** One line per attempt; attempt_no counts a student's tries on the same level, from 1. */
export function attemptsCsv(rows: ExportRow[]) {
  const tries = new Map<string, number>();
  const lines = [...rows].sort(chronological).map((r) => {
    const key = `${r.student_id}:${r.level_id}`;
    tries.set(key, (tries.get(key) ?? 0) + 1);
    const efficiency = r.outcome === "success" ? (r.optimal_tiles / r.tiles_used).toFixed(3) : "";
    return [
      csvText(r.classroom),
      csvText(r.student),
      csvText(r.level),
      tries.get(key),
      csvDate(r.created_at),
      csvText(r.program.join(" ")),
      r.tiles_used,
      r.optimal_tiles,
      r.outcome,
      r.is_optimal,
      efficiency,
    ].join(",");
  });
  return [CSV_COLUMNS.join(","), ...lines].join("\r\n") + "\r\n";
}
