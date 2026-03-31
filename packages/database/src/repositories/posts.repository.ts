import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AbstractRepository } from '@db/src/abstract.repository';
import { posts } from '@db/src/drizzle/schemas';
import { DATABASE_CONNECTION } from '@db/src/constants';
import { schema } from '@db/src';

@Injectable()
export class PostsRepository extends AbstractRepository<typeof posts, 'posts'> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, posts, 'posts');
  }
}
