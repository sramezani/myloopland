CREATE TABLE "backlink" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"website_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"url_key" text NOT NULL,
	"category" text NOT NULL,
	"cost" text,
	"note" text,
	"link_type" text,
	"position" integer NOT NULL,
	"added_by" text NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "website" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url" text NOT NULL,
	"url_key" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backlink" ADD CONSTRAINT "backlink_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlink" ADD CONSTRAINT "backlink_website_id_website_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."website"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website" ADD CONSTRAINT "website_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "backlink_website_id_url_key_idx" ON "backlink" USING btree ("website_id","url_key");--> statement-breakpoint
CREATE UNIQUE INDEX "website_user_id_url_key_idx" ON "website" USING btree ("user_id","url_key");