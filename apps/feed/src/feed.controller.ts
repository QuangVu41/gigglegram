import { Controller, Get, Query } from '@nestjs/common';
import { FeedService } from '@/src/feed.service';
import {
  PostCreatedEvent,
  POSTS_TOPIC_POST_CREATED,
  POSTS_TOPIC_REEL_WATCHED_5S,
  ReelWatched5sEvent,
} from '@repo/types';
import { EventPattern } from '@nestjs/microservices';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';
import { FindFeedForUserDto } from '@/src/dto/find-feed-for-user.dto';
import { FindSuggestedPostsForUserDto } from '@/src/dto/find-suggested-posts-for-user.dto';
import { FindSuggestedReelsForUserDto } from '@/src/dto/find-suggested-reels-for-user.dto';
import { FindStoriesFeedForUserDto } from '@/src/dto/find-stories-feed-for-user.dto';

@Controller()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @EventPattern(POSTS_TOPIC_POST_CREATED)
  async handlePostCreated(data: PostCreatedEvent) {
    await this.feedService.handlePostCreated(data);
  }

  @EventPattern(POSTS_TOPIC_REEL_WATCHED_5S)
  async handleReelWatched5s(data: any) {
    await this.feedService.handleReelWatched5s(data as ReelWatched5sEvent);
  }

  @Get()
  async findFeedForUser(
    @Query() findFeedForUserDto: FindFeedForUserDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.feedService.findFeedForUser(findFeedForUserDto, user);
  }

  @Get('suggested-posts')
  async findSuggestedPostsForUser(
    @Query() findSuggestedPostsForUserDto: FindSuggestedPostsForUserDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.feedService.findSuggestedPostsForUser(
      findSuggestedPostsForUserDto,
      user,
    );
  }

  @Get('suggested-reels')
  async findSuggestedReelsForUser(
    @Query() findSuggestedReelsForUserDto: FindSuggestedReelsForUserDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.feedService.findSuggestedReelsForUser(
      findSuggestedReelsForUserDto,
      user,
    );
  }

  @Get('stories')
  async findStoriesFeedForUser(
    @Query() findStoriesFeedForUserDto: FindStoriesFeedForUserDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.feedService.findStoriesFeedForUser(
      findStoriesFeedForUserDto,
      user,
    );
  }
}
