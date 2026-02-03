CREATE TYPE "public"."system_settings_category" AS ENUM('video', 'image', 'security');--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "category" "system_settings_category" NOT NULL;