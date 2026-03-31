import { DATABASE_CONNECTION, schema } from '@repo/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UserFollowedEvent, UserUnfollowedEvent } from '@repo/types';
import { inArray } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserEngsService {
  private readonly logger = new Logger(UserEngsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async handleUserFollowed(data: UserFollowedEvent) {
    try {
      const [existingUsers] = await Promise.all([
        this.db.query.users.findMany({
          where: inArray(schema.users.id, [
            data.followingUserId,
            data.followerUserId,
          ]),
        }),
      ]);

      const followerUser = existingUsers.find(
        (user) => user.id === data.followerUserId,
      );
      const followingUser = existingUsers.find(
        (user) => user.id === data.followingUserId,
      );

      if (!followingUser || !followerUser) {
        return;
      }

      await this.db.transaction(async (tx) => {
        try {
          await tx
            .update(schema.users)
            .set({
              followingCount: followerUser.followingCount + 1,
            })
            .where(eq(schema.users.id, followerUser.id));

          await tx
            .update(schema.users)
            .set({
              followersCount: followingUser.followersCount + 1,
            })
            .where(eq(schema.users.id, followingUser.id));
        } catch (error) {
          this.logger.error(
            'Error updateing user engagement counts transaction.',
            error,
          );
          throw error;
        }
      });
    } catch (error) {
      this.logger.error('Error handling user followed event.', error);
    }
  }

  async handleUserUnfollowed(data: UserUnfollowedEvent) {
    try {
      const [existingUsers] = await Promise.all([
        this.db.query.users.findMany({
          where: inArray(schema.users.id, [
            data.followingUserId,
            data.followerUserId,
          ]),
        }),
      ]);

      const followerUser = existingUsers.find(
        (user) => user.id === data.followerUserId,
      );
      const followingUser = existingUsers.find(
        (user) => user.id === data.followingUserId,
      );

      if (!followingUser || !followerUser) {
        return;
      }

      await this.db.transaction(async (tx) => {
        try {
          await tx
            .update(schema.users)
            .set({
              followingCount: Math.max(0, followerUser.followingCount - 1),
            })
            .where(eq(schema.users.id, followerUser.id));

          await tx
            .update(schema.users)
            .set({
              followersCount: Math.max(0, followingUser.followersCount - 1),
            })
            .where(eq(schema.users.id, followingUser.id));
        } catch (error) {
          this.logger.error(
            'Error updating user engagement counts transaction.',
            error,
          );
          throw error;
        }
      });
    } catch (error) {
      this.logger.error('Error handling user unfollowed event.', error);
    }
  }
}
