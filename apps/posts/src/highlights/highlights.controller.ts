import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HighlightsService } from '@/src/highlights/highlights.service';
import { FindManyHighlightsDto } from '@/src/highlights/dto/find-many-highlights.dto';
import { CreateHighlightDto } from '@/src/highlights/dto/create-highlight.dto';
import { users } from '@repo/database';
import { CurrentUser, Perms } from '@repo/common';
import { UpdateHighlightDto } from '@/src/highlights/dto/update-highlight.dto';
import { DeleteManyHighlightsDto } from '@/src/highlights/dto/delete-many-highlights.dto';

@Controller('highlights')
export class HighlightsController {
  constructor(private readonly highlightsService: HighlightsService) {}

  @Get()
  async findManyHighlights(
    @Query() findManyHighlightsDto: FindManyHighlightsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.highlightsService.findManyHighlights(
      findManyHighlightsDto,
      user,
    );
  }

  @Get('stats')
  async getHighlightsStats(
    @Query() findManyHighlightsDto: FindManyHighlightsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.highlightsService.getHighlightsStats(
      findManyHighlightsDto,
      user,
    );
  }

  @Get('all')
  async findAllHighlights(
    @Query() findManyHighlightsDto: FindManyHighlightsDto,
  ) {
    return await this.highlightsService.findAllHighlights(
      findManyHighlightsDto,
    );
  }

  @Get('all/stats')
  async getAllHighlightsStats(
    @Query() findManyHighlightsDto: FindManyHighlightsDto,
  ) {
    return await this.highlightsService.getAllHighlightsStats(
      findManyHighlightsDto,
    );
  }

  @Get('{:highlightId}')
  async findOneHighlight(@Param('highlightId') highlightId: string) {
    return await this.highlightsService.findOneHighlight(highlightId);
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
    @Param('highlightId') highlightId: string,
    @Body() updateHighlightDto: UpdateHighlightDto,
  ) {
    return await this.highlightsService.updateHighlight(
      highlightId,
      updateHighlightDto,
    );
  }

  @Perms({ highlight: ['delete'] })
  @Delete('bulk')
  async deleteManyHighlights(
    @Body() deleteManyHighlightsDto: DeleteManyHighlightsDto,
  ) {
    return await this.highlightsService.deleteManyHighlights(
      deleteManyHighlightsDto.ids,
    );
  }

  @Perms(
    { highlight: ['delete'] },
    { resourceKey: 'storyHighlights', resourceParamIdKey: 'highlightId' },
  )
  @Delete('{:highlightId}')
  async deleteHighlight(@Param('highlightId') highlightId: string) {
    return await this.highlightsService.deleteHighlight(highlightId);
  }
}
