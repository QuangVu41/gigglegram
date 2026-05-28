import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AbstractRepository } from '@db/src/abstract.repository';
import { postMedia } from '@db/src/drizzle/schemas';
import { DATABASE_CONNECTION } from '@db/src/constants';
import { schema } from '@db/src';

@Injectable()
export class PostMediaRepository extends AbstractRepository<
  typeof postMedia,
  'postMedia'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, postMedia, 'postMedia');
  }
}
