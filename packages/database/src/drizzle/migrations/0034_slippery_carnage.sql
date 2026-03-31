CREATE TYPE "public"."followers_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "followers" ADD COLUMN "status" "followers_status" DEFAULT 'approved' NOT NULL;