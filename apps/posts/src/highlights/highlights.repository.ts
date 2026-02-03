import { Inject, Injectable } from '@nestjs/common';
import {
  AbstractRepository,
  DATABASE_CONNECTION,
  schema,
  storyHighlights,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class HighlightsRepository extends AbstractRepository<
  typeof storyHighlights,
  'storyHighlights'
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly db: NodePgDatabase<typeof schema>,
  ) {
    super(db, storyHighlights, 'storyHighlights');
  }
}
