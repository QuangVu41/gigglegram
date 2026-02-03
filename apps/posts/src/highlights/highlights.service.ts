import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HighlightsRepository } from '@/src/highlights/highlights.repository';
import { FilterHighlightsDto } from '@/src/highlights/dto/filter-highlights.dto';
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
import { eq } from 'drizzle-orm';
import { and } from 'drizzle-orm';

@Injectable()
export class HighlightsService {
  private readonly logger = new Logger(HighlightsService.name);

  constructor(
    private readonly highlightsRepository: HighlightsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findManyHighlights(filterHighlightsDto: FilterHighlightsDto) {
    return await this.highlightsRepository.findMany({}, filterHighlightsDto);
  }

  async createHighlight(
    createHighlightDto: CreateHighlightDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      await this.db.transaction(async (tx) => {
        const [createdHighlight] = await tx
          .insert(storyHighlights)
          .values({
            title: createHighlightDto.title,
            coverStoryId: createHighlightDto.coverStoryId,
            userId: user.id,
          })
          .returning({ id: storyHighlights.id });

        await Promise.all([
          ...createHighlightDto.storyIds.map((storyId) => {
            return tx.insert(storyHighlightItems).values({
              highlightId: createdHighlight!.id,
              storyId,
            });
          }),
        ]);
      });
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

      await this.db.transaction(async (tx) => {
        const newStoryIds = (updateHighlightDto.storyIds || []).filter(
          (sId) =>
            !existingHighlight.storyHighlightItems.some(
              (item) => item.storyId === sId,
            ),
        );
        const deletingStoryIds = existingHighlight.storyHighlightItems
          .map((item) => item.storyId)
          .filter((sId) => !(updateHighlightDto.storyIds || []).includes(sId));

        await tx
          .update(storyHighlights)
          .set({
            title: updateHighlightDto.title || existingHighlight.title,
            coverStoryId:
              updateHighlightDto.coverStoryId || existingHighlight.coverStoryId,
          })
          .where(eq(storyHighlights.id, highlightId));

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
      });
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
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

      await this.highlightsRepository.delete(existingHighlight.id);
    } catch (error) {
      this.logger.error('Error deleting highlight.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }
}
