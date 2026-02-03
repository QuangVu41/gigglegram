ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_key_category_unique";--> statement-breakpoint
ALTER TABLE "system_settings" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_key_unique" UNIQUE("key");--> statement-breakpoint
DROP TYPE "public"."system_settings_category";