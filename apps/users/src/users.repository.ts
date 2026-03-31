import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  AbstractRepository,
  users,
  DATABASE_CONNECTION,
} from '@repo/database';

@Injectable()
export class UsersRepository extends AbstractRepository<typeof users, 'users'> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, users, 'users');
  }
}
