CREATE TYPE "public"."content_reports_type" AS ENUM('post', 'story');--> statement-breakpoint
CREATE TYPE "public"."post_media_moderation_status" AS ENUM('pending', 'approved', 'flagged');--> statement-breakpoint
ALTER TYPE "public"."post_reports_action_taken" RENAME TO "content_reports_action_taken";--> statement-breakpoint
ALTER TYPE "public"."post_reports_status" RENAME TO "content_reports_status";--> statement-breakpoint
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"post_id" uuid,
	"story_id" uuid,
	"reason_id" uuid NOT NULL,
	"additional_info" text,
	"status" "content_reports_status" DEFAULT 'pending' NOT NULL,
	"type" "content_reports_type" DEFAULT 'post' NOT NULL,
	"reviewed_by" text,
	"reviewer_notes" text,
	"action_taken" "content_reports_action_taken",
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"reviewed_at" timestamp,
	CONSTRAINT "content_reports_one_ref_check" CHECK ((
            (post_id IS NOT NULL)::int + 
            (story_id IS NOT NULL)::int
          ) <= 1)
);
--> statement-breakpoint
ALTER TABLE "post_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "post_reports" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_transcoder_job_name_unique";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "only_one_reference";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_report_id_post_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "post_media" ADD COLUMN "transcoder_job_name" varchar;--> statement-breakpoint
ALTER TABLE "post_media" ADD COLUMN "status" "post_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_media" ADD COLUMN "moderation_status" "post_media_moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_media" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reason_id_report_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."report_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contentReports_reporterId_idx" ON "content_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "contentReports_reportedUserId_idx" ON "content_reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "contentReports_postId_idx" ON "content_reports" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "contentReports_storyId_idx" ON "content_reports" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "contentReports_reasonId_idx" ON "content_reports" USING btree ("reason_id");--> statement-breakpoint
CREATE INDEX "contentReports_status_idx" ON "content_reports" USING btree ("status");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_content_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."content_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "transcoder_job_name";--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_transcoder_job_name_unique" UNIQUE("transcoder_job_name");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_one_ref_check" CHECK ((
        (post_id IS NOT NULL)::int + 
        (post_user_tag_id IS NOT NULL)::int + 
        (post_collab_id IS NOT NULL)::int +
        (comment_id IS NOT NULL)::int +
        (report_id IS NOT NULL)::int
      ) <= 1);