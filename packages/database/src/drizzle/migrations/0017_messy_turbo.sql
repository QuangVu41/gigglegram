CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"media_url" varchar NOT NULL,
	"original_raw_file_url" varchar NOT NULL,
	"media_type" varchar NOT NULL,
	"duration" integer,
	"width" integer,
	"height" integer,
	"views_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "stories_original_raw_file_url_unique" UNIQUE("original_raw_file_url")
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stories_userId_idx" ON "stories" USING btree ("user_id");