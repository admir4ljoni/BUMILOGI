// Tables from PLAN.md "Database tables". Our keys match the column names (snake_case),
// so rows look the same in TypeScript, in SQL and in the API's JSON.
// After changing this file run `bun run db:generate` and commit the new SQL in drizzle/.
import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, serial, smallint, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { Cmd } from "../board";

const timestamps = {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const editions = pgTable(
  "editions",
  {
    id: serial().primaryKey(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    tagline: text().notNull(),
    description: text().notNull(),
    contents: text().array().notNull(),
    animals: text().array().notNull(),
    price_idr: integer().notNull(),
    shopee_url: text().notNull(),
    buy_enabled: boolean().notNull().default(true), // false: the product page says "Segera Hadir" instead of linking to Shopee
    image_url: text(),
    color: text().notNull(), // a palette token name from globals.css, e.g. 'green', 'blue'
    sort_order: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [check("editions_price_positive", sql`${t.price_idr} > 0`)],
);

export const levels = pgTable(
  "levels",
  {
    id: serial().primaryKey(),
    edition_id: integer()
      .notNull()
      .references(() => editions.id),
    title: text().notNull(),
    hint: text().notNull(),
    start_x: smallint().notNull(),
    start_y: smallint().notNull(),
    target_x: smallint().notNull(),
    target_y: smallint().notNull(),
    obstacles: jsonb().$type<[number, number][]>().notNull(),
    optimal_tiles: smallint().notNull(), // from solve(), saved by the server
    solution: jsonb().$type<Cmd[]>().notNull(), // one shortest program
    published_at: date(), // null = draft; teachers see published levels
    on_site: boolean().notNull().default(false), // shown on the public virtual board
    sort_order: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check(
      "levels_cells_on_board",
      sql`${t.start_x} between 0 and 5 and ${t.start_y} between 0 and 5 and ${t.target_x} between 0 and 5 and ${t.target_y} between 0 and 5`,
    ),
  ],
);

// Teacher data (PLAN.md "Database tables"). Deleting a teacher, classroom or student deletes
// everything under it; levels can't be deleted while attempts point at them.
export const classrooms = pgTable(
  "classrooms",
  {
    id: serial().primaryKey(),
    teacher_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    created_at: timestamps.created_at,
  },
  (t) => [index("classrooms_teacher_id_idx").on(t.teacher_id)],
);

export const students = pgTable(
  "students",
  {
    id: serial().primaryKey(),
    classroom_id: integer()
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    name: text().notNull(), // first name only
    created_at: timestamps.created_at,
  },
  (t) => [index("students_classroom_id_idx").on(t.classroom_id)],
);

export const assignments = pgTable(
  "assignments",
  {
    id: serial().primaryKey(),
    classroom_id: integer()
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    level_id: integer()
      .notNull()
      .references(() => levels.id, { onDelete: "cascade" }), // a level can only be deleted before anyone played it
    created_at: timestamps.created_at,
  },
  (t) => [unique("assignments_classroom_level").on(t.classroom_id, t.level_id)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: serial().primaryKey(),
    student_id: integer()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    level_id: integer()
      .notNull()
      .references(() => levels.id),
    program: jsonb().$type<Cmd[]>().notNull(), // 1–18 tiles
    tiles_used: smallint().notNull(),
    optimal_tiles: smallint().notNull(), // copied from the level when the attempt was graded
    outcome: text().notNull(),
    is_optimal: boolean().notNull(),
    created_at: timestamps.created_at,
  },
  (t) => [
    index("attempts_student_id_idx").on(t.student_id),
    index("attempts_level_id_idx").on(t.level_id),
    check("attempts_outcome_valid", sql`${t.outcome} in ('success', 'collision', 'incomplete')`),
  ],
);

// Better Auth's tables. Keys are Better Auth's camelCase field names (its adapter looks them up),
// columns are snake_case. Generated from Better Auth 1.7's drizzle schema generator, plus `role`.
const authTime = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text(),
    role: text().notNull().default("teacher"), // 'teacher' or 'admin'
    createdAt: authTime("created_at"),
    updatedAt: authTime("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [check("user_role_valid", sql`${t.role} in ('teacher', 'admin')`)],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: authTime("created_at"),
    updatedAt: authTime("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(), // 'credential' for email + password, later 'google'
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text(),
    password: text(), // hash, only for 'credential'
    createdAt: authTime("created_at"),
    updatedAt: authTime("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: authTime("created_at"),
    updatedAt: authTime("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export type Edition = typeof editions.$inferSelect;
export type Level = typeof levels.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
