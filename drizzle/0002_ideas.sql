CREATE TABLE "idea" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"details" text,
	"claude_rating" integer,
	"codex_rating" integer,
	"my_rating" integer,
	"published" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "idea_ratings_check" CHECK ("idea"."claude_rating" between 1 and 10 and "idea"."codex_rating" between 1 and 10 and "idea"."my_rating" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "idea" ADD CONSTRAINT "idea_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_user_id_created_at_idx" ON "idea" USING btree ("user_id","created_at");