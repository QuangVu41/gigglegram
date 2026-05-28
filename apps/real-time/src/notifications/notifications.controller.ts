import { Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
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
  POSTS_TOPIC_POST_UPDATED,
  PostCreatedEvent,
  PostUpdatedEvent,
  ReviewerAssignedEvent,
  POST_REPORTS_TOPIC_REVIEWER_ASSIGNED,
  POST_REPORTS_TOPIC_REPORT_UPDATED,
  ReportUpdatedEvent,
  FindManyQueryDto,
  MediaViolationEvent,
  NOTIFICATIONS_TOPIC_MEDIA_VIOLATION,
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

  @EventPattern(POSTS_TOPIC_POST_UPDATED)
  async handlePostUpdated(data: PostUpdatedEvent) {
    return await this.notificationsService.handlePostUpdated(data);
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

  @EventPattern(NOTIFICATIONS_TOPIC_MEDIA_VIOLATION)
  async handleMediaViolation(data: MediaViolationEvent) {
    return await this.notificationsService.handleMediaViolation(data);
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

  @Patch('{:notificationId}/read')
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return await this.notificationsService.markNotificationAsRead(
      notificationId,
      user,
    );
  }

  @Delete(':notificationId')
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
