import { DATABASE_CONNECTION, schema } from '@repo/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';

@Injectable()
export class PostsSyncService {
  private readonly logger = new Logger(PostsSyncService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncDenormalizedCounts() {
    this.logger.log('Starting post counts sync...');

    await this.db.execute(sql`
      UPDATE posts p
      SET
        "likes_count" = (SELECT COUNT(*) FROM likes WHERE "post_id" = p.id),
        "comments_count" = (SELECT COUNT(*) FROM comments WHERE "post_id" = p.id),
        "saves_count" = (SELECT COUNT(*) FROM saved_posts WHERE "post_id" = p.id)
      WHERE p."updated_at" >= NOW() - INTERVAL '15 minutes'
    `);

    this.logger.log('Post counts sync complete.');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async fullResync() {
    this.logger.log('Running full resync...');

    await Promise.all([
      this.db.execute(sql`
      UPDATE posts p
      SET
        "likes_count" = (SELECT COUNT(*) FROM likes WHERE "post_id" = p.id),
        "comments_count" = (SELECT COUNT(*) FROM comments WHERE "post_id" = p.id),
        "saves_count" = (SELECT COUNT(*) FROM saved_posts WHERE "post_id" = p.id)
    `),
      this.db.execute(sql`
      UPDATE audio_tracks a
      SET "usage_count" = (SELECT COUNT(*) FROM posts WHERE "audio_id" = a.id)
    `),
      this.db.execute(sql`
      UPDATE hashtags h
      SET "posts_count" = (SELECT COUNT(*) FROM post_hashtags WHERE "hashtag_id" = h.id)
    `),
      this.db.execute(sql`
      UPDATE locations l
      SET "posts_count" = (SELECT COUNT(*) FROM posts WHERE "location_id" = l.id)
    `),
    ]);

    this.logger.log('Full resync complete.');
  }
}
