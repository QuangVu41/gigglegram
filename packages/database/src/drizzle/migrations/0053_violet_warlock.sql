CREATE TYPE "public"."language" AS ENUM('en', 'vi');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "language" "language" DEFAULT 'en' NOT NULL;