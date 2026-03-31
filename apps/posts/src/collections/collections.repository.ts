import { Inject, Injectable } from '@nestjs/common';
import {
  AbstractRepository,
  DATABASE_CONNECTION,
  posts,
  savedCollections,
  schema,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class CollectionsRepository extends AbstractRepository<
  typeof savedCollections,
  'savedCollections'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, savedCollections, 'savedCollections');
  }
}
