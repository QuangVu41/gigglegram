import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  AbstractRepository,
  DATABASE_CONNECTION,
  comments,
} from '@repo/database';

@Injectable()
export class CommentsRepository extends AbstractRepository<
  typeof comments,
  'comments'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, comments, 'comments');
  }
}
