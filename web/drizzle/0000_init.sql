CREATE TABLE "editions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"contents" text[] NOT NULL,
	"animals" text[] NOT NULL,
	"price_idr" integer NOT NULL,
	"shopee_url" text NOT NULL,
	"image_url" text,
	"color" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "editions_price_positive" CHECK ("editions"."price_idr" > 0)
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"title" text NOT NULL,
	"hint" text NOT NULL,
	"start_x" smallint NOT NULL,
	"start_y" smallint NOT NULL,
	"target_x" smallint NOT NULL,
	"target_y" smallint NOT NULL,
	"obstacles" jsonb NOT NULL,
	"optimal_tiles" smallint NOT NULL,
	"solution" jsonb NOT NULL,
	"published_at" date,
	"on_site" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "levels_cells_on_board" CHECK ("levels"."start_x" between 0 and 5 and "levels"."start_y" between 0 and 5 and "levels"."target_x" between 0 and 5 and "levels"."target_y" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;