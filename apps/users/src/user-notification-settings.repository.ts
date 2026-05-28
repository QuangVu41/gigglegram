import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  AbstractRepository,
  DATABASE_CONNECTION,
} from '@repo/database';

@Injectable()
export class UserNotificationSettingsRepository extends AbstractRepository<
  typeof schema.userNotificationSettings,
  'userNotificationSettings'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, schema.userNotificationSettings, 'userNotificationSettings');
  }
}
