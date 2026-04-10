ALTER TABLE "locations" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "locations" ALTER COLUMN "city" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "locations" ALTER COLUMN "country" SET DATA TYPE text;--> statement-breakpoint
CREATE INDEX "locations_name_city_country_search_idx" ON "locations" USING gin ((setweight(to_tsvector('english', "name"), 'A') || setweight(to_tsvector('english', "city"), 'B') || setweight(to_tsvector('english', "country"), 'C')));