ALTER TABLE "users" ALTER COLUMN "followers_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "following_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "posts_count" SET NOT NULL;