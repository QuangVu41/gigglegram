CREATE TYPE "public"."post_reports_action_taken" AS ENUM('post_removed', 'account_warned', 'account_suspended', 'no_action');--> statement-breakpoint
CREATE TYPE "public"."post_reports_status" AS ENUM('pending', 'under_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_reasons_category" AS ENUM('spam', 'harassment', 'violence', 'hate_speech', 'misinformation', 'copyright');--> statement-breakpoint
CREATE TABLE "post_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"reason_id" uuid NOT NULL,
	"additional_info" text,
	"status" "post_reports_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewer_notes" text,
	"action_taken" "post_reports_action_taken",
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "report_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason_code" varchar NOT NULL,
	"description" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"category" "report_reasons_category" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_reasons_reason_code_unique" UNIQUE("reason_code")
);
--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reason_id_report_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."report_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "postReports_reporterId_idx" ON "post_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "postReports_reportedUserId_idx" ON "post_reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "postReports_postId_idx" ON "post_reports" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "postReports_reasonId_idx" ON "post_reports" USING btree ("reason_id");--> statement-breakpoint
CREATE INDEX "postReports_status_idx" ON "post_reports" USING btree ("status");