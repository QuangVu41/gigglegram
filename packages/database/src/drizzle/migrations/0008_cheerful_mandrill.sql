ALTER TABLE "post_user_tags" DROP CONSTRAINT "post_user_tags_media_id_post_media_id_fk";
--> statement-breakpoint
DROP INDEX "postUserTags_mediaId_idx";--> statement-breakpoint
ALTER TABLE "post_user_tags" DROP COLUMN "media_id";--> statement-breakpoint
ALTER TABLE "post_user_tags" ADD CONSTRAINT "postUserTags_postId_userId_unique" UNIQUE("post_id","user_id");