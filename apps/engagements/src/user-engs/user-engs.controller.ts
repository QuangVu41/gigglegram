import { Controller } from '@nestjs/common';
import { UserEngsService } from '@/src/user-engs/user-engs.service';
import { EventPattern } from '@nestjs/microservices';
import {
  UserFollowedEvent,
  USERS_TOPIC_USER_FOLLOWED,
  USERS_TOPIC_USER_UNFOLLOWED,
  UserUnfollowedEvent,
} from '@repo/types';

@Controller()
export class UserEngsController {
  constructor(private readonly userEngsService: UserEngsService) {}

  @EventPattern(USERS_TOPIC_USER_FOLLOWED)
  async handleUserFollowed(data: UserFollowedEvent) {
    this.userEngsService.handleUserFollowed(data);
  }

  @EventPattern(USERS_TOPIC_USER_UNFOLLOWED)
  async handleUserUnfollowed(data: UserUnfollowedEvent) {
    this.userEngsService.handleUserUnfollowed(data);
  }
}
