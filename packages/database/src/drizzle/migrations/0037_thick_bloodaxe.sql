ALTER TABLE "post_collaborators" RENAME COLUMN "approved_at" TO "accepted_at";--> statement-breakpoint
ALTER TABLE "post_user_tags" RENAME COLUMN "approved_at" TO "accepted_at";--> statement-breakpoint
ALTER TABLE "post_collaborators" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "post_collaborators" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."post_collaborators_status";--> statement-breakpoint
CREATE TYPE "public"."post_collaborators_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
ALTER TABLE "post_collaborators" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."post_collaborators_status";--> statement-breakpoint
ALTER TABLE "post_collaborators" ALTER COLUMN "status" SET DATA TYPE "public"."post_collaborators_status" USING "status"::"public"."post_collaborators_status";--> statement-breakpoint
ALTER TABLE "post_user_tags" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "post_user_tags" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."post_user_tags_status";--> statement-breakpoint
CREATE TYPE "public"."post_user_tags_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
ALTER TABLE "post_user_tags" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."post_user_tags_status";--> statement-breakpoint
ALTER TABLE "post_user_tags" ALTER COLUMN "status" SET DATA TYPE "public"."post_user_tags_status" USING "status"::"public"."post_user_tags_status";--> statement-breakpoint
ALTER TABLE "followers" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "followers" ALTER COLUMN "status" SET DEFAULT 'accepted'::text;--> statement-breakpoint
DROP TYPE "public"."followers_status";--> statement-breakpoint
CREATE TYPE "public"."followers_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
ALTER TABLE "followers" ALTER COLUMN "status" SET DEFAULT 'accepted'::"public"."followers_status";--> statement-breakpoint
ALTER TABLE "followers" ALTER COLUMN "status" SET DATA TYPE "public"."followers_status" USING "status"::"public"."followers_status";