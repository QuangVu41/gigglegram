import { DATABASE_CONNECTION, schema } from '@repo/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';

@Injectable()
export class UsersSyncService {
  private readonly logger = new Logger(UsersSyncService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncDenormalizedCounts() {
    this.logger.log('Starting user counts sync...');

    await this.db.execute(sql`
      UPDATE users u
      SET
        "followers_count" = (SELECT COUNT(*) FROM followers WHERE "following_id" = u.id),
        "following_count" = (SELECT COUNT(*) FROM followers WHERE "follower_id" = u.id),
        "posts_count" = (SELECT COUNT(*) FROM posts WHERE "user_id" = u.id)
      WHERE u."updated_at" >= NOW() - INTERVAL '15 minutes'
    `);

    this.logger.log('User counts sync complete.');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async fullResync() {
    this.logger.log('Running full resync...');

    await this.db.execute(sql`
      UPDATE users u
      SET
        "followers_count" = (SELECT COUNT(*) FROM followers WHERE "following_id" = u.id),
        "following_count" = (SELECT COUNT(*) FROM followers WHERE "follower_id" = u.id),
        "posts_count" = (SELECT COUNT(*) FROM posts WHERE "user_id" = u.id)
    `);

    this.logger.log('Full resync complete.');
  }
}
