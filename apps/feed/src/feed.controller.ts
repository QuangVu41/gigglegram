import { Controller, Get, Query } from '@nestjs/common';
import { FeedService } from '@/src/feed.service';
import { PostCreatedEvent, POSTS_TOPIC_POST_CREATED } from '@repo/types';
import { EventPattern } from '@nestjs/microservices';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';
import { FindFeedForUserDto } from '@/src/dto/find-feed-for-user.dto';
import { FindSuggestedPostsForUserDto } from '@/src/dto/find-suggested-posts-for-user.dto';
import { FindSuggestedReelsForUserDto } from '@/src/dto/find-suggested-reels-for-user.dto';

@Controller()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @EventPattern(POSTS_TOPIC_POST_CREATED)
  async handlePostCreated(data: PostCreatedEvent) {
    await this.feedService.handlePostCreated(data);
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
}
