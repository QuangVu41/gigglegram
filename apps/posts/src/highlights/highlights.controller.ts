import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { HighlightsService } from '@/src/highlights/highlights.service';
import { FindManyHighlightsDto } from '@/src/highlights/dto/find-many-highlights.dto';
import { CreateHighlightDto } from '@/src/highlights/dto/create-highlight.dto';
import { users } from '@repo/database';
import { CurrentUser, Perms } from '@repo/common';
import { UpdateHighlightDto } from '@/src/highlights/dto/update-highlight.dto';

@Controller('highlights')
export class HighlightsController {
  constructor(private readonly highlightsService: HighlightsService) {}

  @Get()
  async findManyHighlights(
    @Body() findManyHighlightsDto: FindManyHighlightsDto,
  ) {
    return await this.highlightsService.findManyHighlights(
      findManyHighlightsDto,
    );
  }

  @Post()
  async createHighlight(
    @Body() createHighlightDto: CreateHighlightDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.highlightsService.createHighlight(
      createHighlightDto,
      user,
    );
  }

  @Perms(
    { highlight: ['update'] },
    {
      resourceKey: 'storyHighlights',
      resourceParamIdKey: 'highlightId',
    },
  )
  @Patch('{:highlightId}')
  async updateHighlight(
    highlightId: string,
    @Body() updateHighlightDto: UpdateHighlightDto,
  ) {
    return await this.highlightsService.updateHighlight(
      highlightId,
      updateHighlightDto,
    );
  }

  @Perms(
    { highlight: ['delete'] },
    { resourceKey: 'storyHighlights', resourceParamIdKey: 'highlightId' },
  )
  @Delete('{:highlightId}')
  async deleteHighlight(@Body() highlightId: string) {
    return await this.highlightsService.deleteHighlight(highlightId);
  }
}
