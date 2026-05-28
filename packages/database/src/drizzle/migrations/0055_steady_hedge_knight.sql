CREATE TABLE "saved_audio_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"audio_track_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "savedAudioTracks_userId_audioTrackId_unique" UNIQUE("user_id","audio_track_id")
);
--> statement-breakpoint
ALTER TABLE "saved_audio_tracks" ADD CONSTRAINT "saved_audio_tracks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_audio_tracks" ADD CONSTRAINT "saved_audio_tracks_audio_track_id_audio_tracks_id_fk" FOREIGN KEY ("audio_track_id") REFERENCES "public"."audio_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "savedAudioTracks_userId_idx" ON "saved_audio_tracks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savedAudioTracks_audioTrackId_idx" ON "saved_audio_tracks" USING btree ("audio_track_id");