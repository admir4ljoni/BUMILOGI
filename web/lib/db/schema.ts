// Tables from PLAN.md "Database tables". Keys match the column names (snake_case),
// so rows look the same in TypeScript, in SQL and in the API's JSON.
// After changing this file run `bun run db:generate` and commit the new SQL in drizzle/.
import { sql } from "drizzle-orm";
import { boolean, check, date, integer, jsonb, pgTable, serial, smallint, text, timestamp } from "drizzle-orm/pg-core";
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

export type Edition = typeof editions.$inferSelect;
export type Level = typeof levels.$inferSelect;
