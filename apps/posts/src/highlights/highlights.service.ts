import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HighlightsRepository } from '@/src/highlights/highlights.repository';
import { FindManyHighlightsDto } from '@/src/highlights/dto/find-many-highlights.dto';
import { CreateHighlightDto } from '@/src/highlights/dto/create-highlight.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_CONNECTION,
  schema,
  storyHighlightItems,
  storyHighlights,
  users,
} from '@repo/database';
import { SystemWideErrorCodes } from '@repo/types';
import { UpdateHighlightDto } from '@/src/highlights/dto/update-highlight.dto';
import { eq, and, count, sum, isNotNull } from 'drizzle-orm';

@Injectable()
export class HighlightsService {
  private readonly logger = new Logger(HighlightsService.name);

  constructor(
    private readonly highlightsRepository: HighlightsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findManyHighlights(
    findManyHighlightsDto: FindManyHighlightsDto,
    user?: typeof users.$inferSelect,
  ) {
    const userId = findManyHighlightsDto.userId || user?.id;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return await this.highlightsRepository.findMany(
      {
        where: eq(storyHighlights.userId, userId),
        with: {
          story: true,
          user: true,
        },
      },
      findManyHighlightsDto,
    );
  }

  async findAllHighlights(findManyHighlightsDto: FindManyHighlightsDto) {
    return await this.highlightsRepository.findMany(
      {
        with: {
          story: true,
          user: true,
        },
      },
      findManyHighlightsDto,
    );
  }

  async findOneHighlight(highlightId: string) {
    const highlight = await this.highlightsRepository.findFirst({
      where: eq(storyHighlights.id, highlightId),
      with: {
        user: true,
        storyHighlightItems: {
          with: {
            story: true,
          },
        },
      },
    });

    if (!highlight) {
      throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });
    }

    return highlight;
  }

  async createHighlight(
    createHighlightDto: CreateHighlightDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const createdHighlight = await this.db.transaction(async (tx) => {
        const [createdHighlight] = await tx
          .insert(storyHighlights)
          .values({
            title: createHighlightDto.title,
            coverStoryId: createHighlightDto.coverStoryId,
            userId: user.id,
            storiesCount: createHighlightDto.storyIds.length,
          })
          .returning();

        await Promise.all([
          ...createHighlightDto.storyIds.map((storyId) => {
            return tx.insert(storyHighlightItems).values({
              highlightId: createdHighlight!.id,
              storyId,
            });
          }),
        ]);

        return createdHighlight;
      });

      return createdHighlight;
    } catch (error) {
      this.logger.error('Error creating new highlight.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async updateHighlight(
    highlightId: string,
    updateHighlightDto: UpdateHighlightDto,
  ) {
    try {
      const existingHighlight = await this.highlightsRepository.findFirst({
        where: eq(storyHighlights.id, highlightId),
        with: {
          storyHighlightItems: {
            columns: {
              id: true,
              storyId: true,
            },
          },
        },
      });
      if (!existingHighlight)
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

      const updatedHighlight = await this.db.transaction(async (tx) => {
        const newStoryIds = (updateHighlightDto.storyIds || []).filter(
          (sId) =>
            !existingHighlight.storyHighlightItems.some(
              (item) => item.storyId === sId,
            ),
        );
        const deletingStoryIds = existingHighlight.storyHighlightItems
          .map((item) => item.storyId)
          .filter((sId) => !(updateHighlightDto.storyIds || []).includes(sId));

        const [updatedHighlight] = await tx
          .update(storyHighlights)
          .set({
            title: updateHighlightDto.title || existingHighlight.title,
            coverStoryId:
              updateHighlightDto.coverStoryId || existingHighlight.coverStoryId,
            storiesCount:
              existingHighlight.storiesCount +
              newStoryIds.length -
              deletingStoryIds.length,
          })
          .where(eq(storyHighlights.id, highlightId))
          .returning();

        await Promise.all([
          ...newStoryIds.map((sId) => {
            return tx.insert(storyHighlightItems).values({
              highlightId: highlightId,
              storyId: sId,
            });
          }),
          ...deletingStoryIds.map((sId) => {
            return tx
              .delete(storyHighlightItems)
              .where(
                and(
                  eq(storyHighlightItems.highlightId, highlightId),
                  eq(storyHighlightItems.storyId, sId),
                ),
              );
          }),
        ]);

        return updatedHighlight;
      });

      return updatedHighlight;
    } catch (error) {
      this.logger.error('Error updating new highlight.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
  }

  async deleteHighlight(highlightId: string) {
    try {
      const existingHighlight = await this.highlightsRepository.findFirst({
        where: eq(storyHighlights.id, highlightId),
      });

      if (!existingHighlight)
        throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });

      const deletedHighlight = await this.highlightsRepository.delete(
        existingHighlight.id,
      );

      return deletedHighlight;
    } catch (error) {
      this.logger.error('Error deleting highlight.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async getHighlightsStats(
    findManyHighlightsDto: FindManyHighlightsDto,
    user?: typeof users.$inferSelect,
  ) {
    const userId = findManyHighlightsDto.userId || user?.id;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const whereConditions = [eq(storyHighlights.userId, userId)];
    const where = and(...whereConditions);

    const [total, totalStoriesCount, withCovers] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(storyHighlights)
        .where(where)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({
          totalStories: sum(storyHighlights.storiesCount),
        })
        .from(storyHighlights)
        .where(where)
        .then((res) => res[0]?.totalStories ?? '0'),
      this.db
        .select({ count: count() })
        .from(storyHighlights)
        .where(and(where, isNotNull(storyHighlights.coverStoryId)))
        .then((res) => res[0]?.count ?? 0),
    ]);

    return {
      totalHighlights: Number(total),
      totalStoriesCount: Number(totalStoriesCount),
      withCovers: Number(withCovers),
    };
  }

  async getAllHighlightsStats(findManyHighlightsDto: FindManyHighlightsDto) {
    const [total, totalStoriesCount, withCovers] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(storyHighlights)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({
          totalStories: sum(storyHighlights.storiesCount),
        })
        .from(storyHighlights)
        .then((res) => res[0]?.totalStories ?? '0'),
      this.db
        .select({ count: count() })
        .from(storyHighlights)
        .where(isNotNull(storyHighlights.coverStoryId))
        .then((res) => res[0]?.count ?? 0),
    ]);

    return {
      totalHighlights: Number(total),
      totalStoriesCount: Number(totalStoriesCount),
      withCovers: Number(withCovers),
    };
  }

  async deleteManyHighlights(highlightIds: string[]) {
    const results: any[] = [];
    for (const highlightId of highlightIds) {
      try {
        const result = await this.deleteHighlight(highlightId);
        if (result) results.push(result);
      } catch (error) {
        this.logger.error(
          `Error deleting highlight ${highlightId} in bulk operation.`,
          error,
        );
      }
    }
    return results;
  }
}
