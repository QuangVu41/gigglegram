CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'video', 'file');--> statement-breakpoint
CREATE TYPE "public"."notifications_type_enum" AS ENUM('like', 'comment', 'follow', 'mention', 'follow_request', 'follow_accept', 'comment_like', 'comment_reply', 'tag', 'post_share', 'collab_invite', 'collab_accept', 'reel_like', 'save');--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"parent_comment_id" uuid,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"replies_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"content" text NOT NULL,
	"type" "messages_type_enum" NOT NULL,
	"media_url" text,
	"reply_to_message_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"type" "notifications_type_enum" NOT NULL,
	"post_id" uuid,
	"post_user_tag_id" uuid,
	"post_collab_id" uuid,
	"comment_id" uuid,
	"content" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "only_one_reference" CHECK ((
        (post_id IS NOT NULL)::int + 
        (post_user_tag_id IS NOT NULL)::int + 
        (post_collab_id IS NOT NULL)::int +
        (comment_id IS NOT NULL)::int
      ) <= 1)
);
--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_message_id_messages_id_fk" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_user_tag_id_post_user_tags_id_fk" FOREIGN KEY ("post_user_tag_id") REFERENCES "public"."post_user_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_collab_id_post_collaborators_id_fk" FOREIGN KEY ("post_collab_id") REFERENCES "public"."post_collaborators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_likes_commentId_idx" ON "comment_likes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_likes_userId_idx" ON "comment_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_postId_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_userId_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_parentCommentId_idx" ON "comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "messages_senderId_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_receiverId_idx" ON "messages" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "messages_replyToMessageId_idx" ON "messages" USING btree ("reply_to_message_id");--> statement-breakpoint
CREATE INDEX "notifications_userId_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_actorId_idx" ON "notifications" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "notifications_postId_idx" ON "notifications" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "notifications_postUserTagId_idx" ON "notifications" USING btree ("post_user_tag_id");--> statement-breakpoint
CREATE INDEX "notifications_postCollabId_idx" ON "notifications" USING btree ("post_collab_id");--> statement-breakpoint
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_createdAt_idx" ON "notifications" USING btree ("created_at");