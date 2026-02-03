ALTER TABLE "post_user_tags" DROP CONSTRAINT "postUserTags_postId_userId_unique";--> statement-breakpoint
ALTER TABLE "post_user_tags" ADD COLUMN "media_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "post_user_tags" ADD CONSTRAINT "post_user_tags_media_id_post_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."post_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "postUserTags_mediaId_idx" ON "post_user_tags" USING btree ("media_id");--> statement-breakpoint
ALTER TABLE "post_user_tags" ADD CONSTRAINT "postUserTags_postId_userId_mediaId_unique" UNIQUE("post_id","user_id","media_id");