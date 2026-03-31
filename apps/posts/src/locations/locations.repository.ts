import { Inject, Injectable } from '@nestjs/common';
import {
  AbstractRepository,
  DATABASE_CONNECTION,
  locations,
  schema,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class LocationsRepository extends AbstractRepository<
  typeof locations,
  'locations'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, locations, 'locations');
  }
}
