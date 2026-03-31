CREATE INDEX "conversation_participants_conversationId_idx" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_commentId_unique" UNIQUE("user_id","comment_id");--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_userId_unique" UNIQUE("conversation_id","user_id");