ALTER TABLE "post_reports" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");