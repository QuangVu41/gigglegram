CREATE TYPE "public"."post_collaborators_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "post_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "post_collaborators_status" DEFAULT 'pending' NOT NULL,
	"is_original_author" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	CONSTRAINT "postCollaborators_postId_userId_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "post_collaborators" ADD CONSTRAINT "post_collaborators_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_collaborators" ADD CONSTRAINT "post_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "postCollaborators_postId_idx" ON "post_collaborators" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "postCollaborators_userId_idx" ON "post_collaborators" USING btree ("user_id");