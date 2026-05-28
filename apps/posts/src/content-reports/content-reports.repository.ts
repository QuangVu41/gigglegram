import { Inject, Injectable } from '@nestjs/common';
import {
  AbstractRepository,
  DATABASE_CONNECTION,
  contentReports,
  schema,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ContentReportsRepository extends AbstractRepository<
  typeof contentReports,
  'contentReports'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, contentReports, 'contentReports');
  }
}
