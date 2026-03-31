import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  AbstractRepository,
  DATABASE_CONNECTION,
  notifications,
} from '@repo/database';

@Injectable()
export class NotificationsRepository extends AbstractRepository<
  typeof notifications,
  'notifications'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, notifications, 'notifications');
  }
}
