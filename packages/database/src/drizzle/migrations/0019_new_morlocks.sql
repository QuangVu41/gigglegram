CREATE TYPE "public"."story_status" AS ENUM('pending', 'published', 'failed');--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "media_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "original_raw_file_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "media_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "thumbnail_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "status" "story_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "transcoder_job_name" varchar;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_transcoder_job_name_unique" UNIQUE("transcoder_job_name");