import { Controller } from '@nestjs/common';
import { PostEngsService } from '@/src/post-engs/post-engs.service';
import { Ctx, EventPattern, KafkaContext } from '@nestjs/microservices';
import {
  PostCreatedEvent,
  PostDeletedEvent,
  POSTS_TOPIC_POST_CREATED,
  POSTS_TOPIC_POST_DELETED,
  POSTS_TOPIC_POST_UPDATED,
  POSTS_TOPIC_POST_VIEWED,
  PostUpdatedEvent,
  type PostViewedEvent,
} from '@repo/types';
import { postMedia } from '@repo/database';

@Controller()
export class PostEngsController {
  constructor(private readonly postEngsService: PostEngsService) {}

  @EventPattern(POSTS_TOPIC_POST_CREATED)
  async handlePostCreated(
    data: PostCreatedEvent,
    @Ctx() context: KafkaContext,
  ) {
    await this.postEngsService.handlePostCreated(data, context);
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

  @EventPattern(POSTS_TOPIC_POST_VIEWED)
  async handlePostViewed(data: PostViewedEvent) {
    await this.postEngsService.handlePostViewed(data);
  }
}
