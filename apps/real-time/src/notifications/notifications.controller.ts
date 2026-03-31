import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { NotificationsService } from '@/src/notifications/notifications.service';
import {
  PostLikedEvent,
  UserFollowedEvent,
  USERS_TOPIC_USER_FOLLOWED,
  POSTS_TOPIC_POST_LIKED,
  UserFollowAcceptedEvent,
  USERS_TOPIC_USER_FOLLOW_ACCEPTED,
  PostCollaboratorAcceptedEvent,
  POSTS_TOPIC_POST_COLLABORATOR_ACCEPTED,
  POSTS_TOPIC_POST_CREATED,
  PostCreatedEvent,
  ReviewerAssignedEvent,
  POST_REPORTS_TOPIC_REVIEWER_ASSIGNED,
  POST_REPORTS_TOPIC_REPORT_UPDATED,
  ReportUpdatedEvent,
  FindManyQueryDto,
} from '@repo/types';
import { EventPattern } from '@nestjs/microservices';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern(USERS_TOPIC_USER_FOLLOWED)
  async handleUserFollowed(data: UserFollowedEvent) {
    return await this.notificationsService.handleUserFollowed(data);
  }

  @EventPattern(USERS_TOPIC_USER_FOLLOW_ACCEPTED)
  async handleUserFollowAccepted(data: UserFollowAcceptedEvent) {
    return await this.notificationsService.handleUserFollowAccepted(data);
  }

  @EventPattern(POSTS_TOPIC_POST_LIKED)
  async handlePostLiked(data: PostLikedEvent) {
    return await this.notificationsService.handlePostLiked(data);
  }

  @EventPattern(POSTS_TOPIC_POST_CREATED)
  async handlePostCreated(data: PostCreatedEvent) {
    return await this.notificationsService.handlePostCreated(data);
  }

  @EventPattern(POSTS_TOPIC_POST_COLLABORATOR_ACCEPTED)
  async handlePostCollaboratorAccepted(data: PostCollaboratorAcceptedEvent) {
    return await this.notificationsService.handlePostCollaboratorAccepted(data);
  }

  @EventPattern(POST_REPORTS_TOPIC_REVIEWER_ASSIGNED)
  async handleReviewerAssigned(data: ReviewerAssignedEvent) {
    return await this.notificationsService.handleReviewerAssigned(data);
  }

  @EventPattern(POST_REPORTS_TOPIC_REPORT_UPDATED)
  async handleReportUpdated(data: ReportUpdatedEvent) {
    return await this.notificationsService.handleReportUpdated(data);
  }

  @Get()
  async findUserNotifications(
    @Query() findManyQueryDto: FindManyQueryDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.notificationsService.findUserNotifications(
      findManyQueryDto,
      user,
    );
  }

  @Delete('{:notificationId}')
  async deleteNotification(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.notificationsService.deleteNotification(
      notificationId,
      user,
    );
  }
}
