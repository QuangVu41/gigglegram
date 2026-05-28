import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  POSTS_TOPIC_STORY_CREATED,
  POSTS_TOPIC_STORY_VIEWED,
} from '@repo/types';
import type { StoryCreatedEvent, StoryViewedEvent } from '@repo/types';
import { StoryEngsService } from '@/src/story-engs/story-engs.service';

@Controller()
export class StoryEngsController {
  constructor(private readonly storyEngsService: StoryEngsService) {}

  @EventPattern(POSTS_TOPIC_STORY_CREATED)
  async handleStoryCreated(@Payload() data: StoryCreatedEvent) {
    return await this.storyEngsService.handleStoryCreated(data);
  }

  @EventPattern(POSTS_TOPIC_STORY_VIEWED)
  async handleStoryViewed(@Payload() data: StoryViewedEvent) {
    return await this.storyEngsService.handleStoryViewed(data);
  }
}
