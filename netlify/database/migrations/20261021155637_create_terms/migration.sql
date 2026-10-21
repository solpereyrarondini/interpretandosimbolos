CREATE TABLE "terms" (
	"id" text PRIMARY KEY,
	"term" text NOT NULL,
	"langs" text[] NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"char" text DEFAULT '' NOT NULL,
	"image_key" text DEFAULT '' NOT NULL,
	"owner_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
