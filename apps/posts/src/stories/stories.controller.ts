import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { StoriesService } from '@/src/stories/stories.service';
import { FilterStoriesDto } from '@/src/stories/dto/filter-stories.dto';
import { FilesValidatorInterceptor } from '@/src/interceptors/files-validator.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, Perms } from '@repo/common';
import { users } from '@repo/database';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  async findManyStories(filterStoriesDto: FilterStoriesDto) {
    return await this.storiesService.findManyStories(filterStoriesDto);
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
