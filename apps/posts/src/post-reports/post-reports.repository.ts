import { Inject, Injectable } from '@nestjs/common';
import {
  AbstractRepository,
  DATABASE_CONNECTION,
  postReports,
  schema,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class PostReportsRepository extends AbstractRepository<
  typeof postReports,
  'postReports'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, postReports, 'postReports');
  }
}
