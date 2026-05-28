ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'media_violation';--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "moderation_status" "post_media_moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "moderation_reason" text;