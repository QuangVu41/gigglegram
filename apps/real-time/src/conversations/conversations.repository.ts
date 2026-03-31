import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  AbstractRepository,
  DATABASE_CONNECTION,
  conversations,
} from '@repo/database';

@Injectable()
export class ConversationsRepository extends AbstractRepository<
  typeof conversations,
  'conversations'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, conversations, 'conversations');
  }
}
