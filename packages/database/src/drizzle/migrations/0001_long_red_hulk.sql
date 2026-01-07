ALTER TABLE "posts" ADD COLUMN "transcoder_job_name" varchar;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_transcoder_job_name_unique" UNIQUE("transcoder_job_name");