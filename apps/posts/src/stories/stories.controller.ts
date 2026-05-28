import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { StoriesService } from '@/src/stories/stories.service';
import { FindManyStoriesDto } from '@/src/stories/dto/find-many-stories.dto';
import { DeleteManyStoriesDto } from '@/src/stories/dto/delete-many-stories.dto';
import { FilesValidatorInterceptor } from '@repo/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, Perms } from '@repo/common';
import { users } from '@repo/database';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  async findManyStories(@Query() findManyStoriesDto: FindManyStoriesDto) {
    return await this.storiesService.findManyStories(findManyStoriesDto);
  }

  @Get('stats')
  async getStoriesStats(@Query() findManyStoriesDto: FindManyStoriesDto) {
    return await this.storiesService.getStoriesStats(findManyStoriesDto);
  }

  @Get('my')
  async findManyUserStories(
    @Query() findManyStoriesDto: FindManyStoriesDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.storiesService.findManyUserStories(
      findManyStoriesDto,
      user,
    );
  }

  @Get('my-archive')
  async findManyUserArchivedStories(
    @Query() findManyStoriesDto: FindManyStoriesDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.storiesService.findManyUserArchivedStories(
      findManyStoriesDto,
      user,
    );
  }

  @Post()
  @UseInterceptors(FilesValidatorInterceptor)
  @UseInterceptors(FileInterceptor('media'))
  async createStory(
    @UploadedFile()
    media: Express.Multer.File,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.storiesService.createStory(media, user);
  }

  @Perms({ story: ['delete'] })
  @Delete('bulk')
  async deleteManyStories(@Body() deleteManyStoriesDto: DeleteManyStoriesDto) {
    return await this.storiesService.deleteManyStories(
      deleteManyStoriesDto.ids,
    );
  }

  @Perms(
    { story: ['delete'] },
    {
      resourceKey: 'stories',
      resourceParamIdKey: 'storyId',
    },
  )
  @Delete('{:storyId}')
  async deleteStory(@Param('storyId') storyId: string) {
    return await this.storiesService.deleteStory(storyId);
  }
}
