import { Controller } from '@nestjs/common';
import { PostEngsService } from '@/src/post-engs/post-engs.service';
import { EventPattern } from '@nestjs/microservices';
import {
  PostCreatedEvent,
  PostDeletedEvent,
  POSTS_TOPIC_POST_CREATED,
  POSTS_TOPIC_POST_DELETED,
  POSTS_TOPIC_POST_UPDATED,
  PostUpdatedEvent,
} from '@repo/types';
import { postMedia } from '@repo/database';

@Controller()
export class PostEngsController {
  constructor(private readonly postEngsService: PostEngsService) {}

  @EventPattern(POSTS_TOPIC_POST_CREATED)
  async handlePostCreated(data: PostCreatedEvent) {
    await this.postEngsService.handlePostCreated(data);
  }

  @EventPattern(POSTS_TOPIC_POST_UPDATED)
  async handlePostUpdated(data: PostUpdatedEvent) {
    await this.postEngsService.handlePostUpdated(data);
  }

  @EventPattern(POSTS_TOPIC_POST_DELETED)
  async handlePostDeleted(
    data: PostDeletedEvent<
      Pick<typeof postMedia.$inferSelect, 'mediaType' | 'originalRawFileUrl'>[]
    >,
  ) {
    await this.postEngsService.handlePostDeleted(data);
  }
}
