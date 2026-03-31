ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'assign_reviewer';--> statement-breakpoint
ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'report_update';--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "only_one_reference";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "report_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_post_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."post_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_commentId_idx" ON "notifications" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "notifications_reportId_idx" ON "notifications" USING btree ("report_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "only_one_reference" CHECK ((
        (post_id IS NOT NULL)::int + 
        (post_user_tag_id IS NOT NULL)::int + 
        (post_collab_id IS NOT NULL)::int +
        (comment_id IS NOT NULL)::int +
        (report_id IS NOT NULL)::int
      ) <= 1);