CREATE TYPE "public"."user_privacy_settings_who_can_comment" AS ENUM('everyone', 'followers', 'no_one');--> statement-breakpoint
CREATE TYPE "public"."user_privacy_settings_who_can_mention" AS ENUM('everyone', 'followers', 'no_one');--> statement-breakpoint
CREATE TYPE "public"."user_privacy_settings_who_can_message" AS ENUM('everyone', 'followers', 'no_one');--> statement-breakpoint
CREATE TYPE "public"."user_privacy_settings_who_can_tag" AS ENUM('everyone', 'followers', 'no_one');--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"likes_notifications" boolean DEFAULT true NOT NULL,
	"comments_notifications" boolean DEFAULT true NOT NULL,
	"new_followers_notifications" boolean DEFAULT true NOT NULL,
	"mentions_notifications" boolean DEFAULT true NOT NULL,
	"messages_notifications" boolean DEFAULT true NOT NULL,
	"video_calls_notifications" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_private" boolean DEFAULT false NOT NULL,
	"who_can_comment" "user_privacy_settings_who_can_comment" DEFAULT 'everyone' NOT NULL,
	"who_can_tag" "user_privacy_settings_who_can_tag" DEFAULT 'everyone' NOT NULL,
	"who_can_mention" "user_privacy_settings_who_can_mention" DEFAULT 'everyone' NOT NULL,
	"who_can_message" "user_privacy_settings_who_can_message" DEFAULT 'everyone' NOT NULL,
	"hide_activity_status" boolean DEFAULT false NOT NULL,
	"hide_likes_count" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_privacy_settings_user_id_idx" ON "user_privacy_settings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_private";