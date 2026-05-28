CREATE TABLE "message_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"media_url" varchar NOT NULL,
	"media_type" varchar NOT NULL,
	"display_order" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration" integer,
	"alt_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messageMedia_messageId_idx" ON "message_media" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "media_url";