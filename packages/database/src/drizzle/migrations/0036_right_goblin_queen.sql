CREATE TYPE "public"."conversations_type_enum" AS ENUM('direct', 'group');--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_at" timestamp,
	"notifications_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "conversations_type_enum" NOT NULL,
	"name" varchar(255),
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "only_one_reference";--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiver_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "messages_receiverId_idx";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversationId_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "receiver_id";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "only_one_reference" CHECK ((
        (post_id IS NOT NULL)::int + 
        (post_user_tag_id IS NOT NULL)::int + 
        (post_collab_id IS NOT NULL)::int +
        (comment_id IS NOT NULL)::int
      ) <= 1);