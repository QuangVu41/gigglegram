import { Inject, Injectable } from '@nestjs/common';
import {
  AbstractRepository,
  DATABASE_CONNECTION,
  reportReasons,
  schema,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class ReportReasonsRepository extends AbstractRepository<
  typeof reportReasons,
  'reportReasons'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, reportReasons, 'reportReasons');
  }
}
