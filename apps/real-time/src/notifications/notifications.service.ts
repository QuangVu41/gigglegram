import {
  DATABASE_CONNECTION,
  notifications,
  notificationsTypeEnum,
  organizations,
  postReportsActionTakenEnum,
  posts,
  schema,
  users,
} from '@repo/database';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { NotificationsRepository } from '@/src/notifications/notifications.repository';
import {
  FindManyQueryDto,
  NEW_NOTIFICATION_EVENT,
  PostCollaboratorAcceptedEvent,
  PostCreatedEvent,
  PostLikedEvent,
  ReportUpdatedEvent,
  ReviewerAssignedEvent,
  UserFollowAcceptedEvent,
  UserFollowedEvent,
} from '@repo/types';
import { EventsGateway } from '@/src/events/providers/events.gateway';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { and } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly eventsGateWay: EventsGateway,
  ) {}

  async handleUserFollowed(data: UserFollowedEvent) {
    const { followerUserId, followingUserId } = data;

    const followingUser = await this.db.query.users.findFirst({
      where: eq(users.id, followingUserId),
      with: {
        userPrivacySetting: true,
        userNotificationSetting: true,
      },
    });

    if (
      followingUser &&
      followingUser.userNotificationSetting?.newFollowersNotifications
    ) {
      let newNotification: typeof notifications.$inferSelect;
      if (followingUser.userPrivacySetting?.accountPrivate) {
        newNotification = await this.notificationsRepository.create({
          userId: followingUserId,
          actorId: followerUserId,
          type: notificationsTypeEnum.enumValues[4], // follow_request
          content: 'requested to follow you.',
        });
      } else {
        newNotification = await this.notificationsRepository.create({
          userId: followingUserId,
          actorId: followerUserId,
          type: notificationsTypeEnum.enumValues[2], // follow
          content: 'started following you.',
        });
      }

      const createdNotification = await this.notificationsRepository.findFirst({
        where: eq(notifications.id, newNotification.id),
        with: {
          actor: true,
        },
      });

      this.eventsGateWay.server
        .to(`user-${followingUserId}`)
        .emit(NEW_NOTIFICATION_EVENT, createdNotification);
    }
  }

  async handleUserFollowAccepted(data: UserFollowAcceptedEvent) {
    const { followerUserId, followingUserId } = data;

    const followerUser = await this.db.query.users.findFirst({
      where: eq(users.id, followerUserId),
      with: {
        userNotificationSetting: true,
      },
    });

    if (!followerUser) return;

    const newNotification = await this.notificationsRepository.create({
      userId: followerUserId,
      actorId: followingUserId,
      type: notificationsTypeEnum.enumValues[5], // follow_accept
      content: 'accepted your follow request.',
    });

    const createdNotification = await this.notificationsRepository.findFirst({
      where: eq(notifications.id, newNotification.id),
      with: {
        actor: true,
      },
    });

    this.eventsGateWay.server
      .to(`user-${followerUserId}`)
      .emit(NEW_NOTIFICATION_EVENT, createdNotification);
  }

  async handlePostLiked(data: PostLikedEvent) {
    const { postId, actorId } = data;

    const existingPost = await this.db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        user: {
          with: {
            userNotificationSetting: true,
          },
        },
      },
    });

    if (!existingPost) return;

    if (!existingPost.user.userNotificationSetting?.likesNotifications) return;

    if (existingPost.userId === actorId) return;

    const newNotification = await this.notificationsRepository.create({
      userId: existingPost.user.id,
      actorId: actorId,
      type: notificationsTypeEnum.enumValues[0], // like
      postId: postId,
      content: 'liked your post.',
    });

    const createdNotification = await this.notificationsRepository.findFirst({
      where: eq(notifications.id, newNotification.id),
      with: {
        actor: true,
      },
    });

    this.eventsGateWay.server
      .to(`user-${existingPost.user.id}`)
      .emit(NEW_NOTIFICATION_EVENT, createdNotification);
  }

  async handlePostCreated(data: PostCreatedEvent) {
    const existingPost = await this.db.query.posts.findFirst({
      where: eq(posts.id, data.postId),
      with: {
        postCollaborators: {
          with: {
            user: {
              with: {
                userNotificationSetting: true,
              },
            },
          },
        },
        postUserTags: {
          with: {
            user: {
              with: {
                userNotificationSetting: true,
              },
            },
          },
        },
        user: {
          with: {
            userNotificationSetting: true,
          },
        },
      },
    });

    if (!existingPost) return;

    const postCollaborators =
      existingPost?.postCollaborators.filter(
        (pc) => pc.userId !== existingPost.userId,
      ) ?? [];

    const postUserTags =
      existingPost?.postUserTags.filter(
        (put) => put.userId !== existingPost.userId,
      ) ?? [];

    postCollaborators.map(async (collaborator) => {
      const newNotification = await this.notificationsRepository.create({
        userId: collaborator.userId,
        actorId: existingPost.userId,
        type: notificationsTypeEnum.enumValues[10], // post_collaboration
        postCollabId: collaborator.id,
        content: `invited you as a collaborator to their post.`,
      });

      const createdNotification = await this.notificationsRepository.findFirst({
        where: eq(notifications.id, newNotification.id),
        with: {
          postCollab: true,
        },
      });

      this.eventsGateWay.server
        .to(`user-${collaborator.userId}`)
        .emit(NEW_NOTIFICATION_EVENT, createdNotification);
    });

    postUserTags.map(async (userTag) => {
      if (!userTag.user.userNotificationSetting?.mentionsNotifications) return;

      const newNotification = await this.notificationsRepository.create({
        userId: userTag.userId,
        actorId: existingPost.userId,
        type: notificationsTypeEnum.enumValues[8], // tag
        postUserTagId: userTag.id,
        content: `tagged you in their post.`,
      });

      const createdNotification = await this.notificationsRepository.findFirst({
        where: eq(notifications.id, newNotification.id),
        with: {
          postUserTag: true,
        },
      });

      this.eventsGateWay.server
        .to(`user-${userTag.userId}`)
        .emit(NEW_NOTIFICATION_EVENT, createdNotification);
    });
  }

  async handlePostCollaboratorAccepted(data: PostCollaboratorAcceptedEvent) {
    const existingPostCollab = await this.db.query.postCollaborators.findFirst({
      where: eq(schema.postCollaborators.id, data.postCollabId),
      with: {
        user: true,
        post: true,
      },
    });

    if (!existingPostCollab) return;

    const newNotification = await this.notificationsRepository.create({
      userId: existingPostCollab.post.userId,
      actorId: existingPostCollab.userId,
      type: notificationsTypeEnum.enumValues[11], // post_collaborator_accepted
      postCollabId: existingPostCollab.id,
      content: `accepted the collaboration request for their post.`,
    });

    const createdNotification = await this.notificationsRepository.findFirst({
      where: eq(notifications.id, newNotification.id),
      with: {
        postCollab: true,
      },
    });

    this.eventsGateWay.server
      .to(`user-${existingPostCollab.post.userId}`)
      .emit(NEW_NOTIFICATION_EVENT, createdNotification);
  }

  async handleReviewerAssigned(data: ReviewerAssignedEvent) {
    const { reportId, assignerId, reviewerId } = data;

    const existingReport = await this.db.query.postReports.findFirst({
      where: eq(schema.postReports.id, reportId),
    });

    if (!existingReport) return;

    const newNotification = await this.notificationsRepository.create({
      userId: reviewerId,
      actorId: assignerId,
      type: notificationsTypeEnum.enumValues[14], // assign_reviewer
      reportId: reportId,
      content: `assigned you as a reviewer for a post report.`,
    });

    const createdNotification = await this.notificationsRepository.findFirst({
      where: eq(notifications.id, newNotification.id),
      with: {
        actor: true,
        report: true,
      },
    });

    this.eventsGateWay.server
      .to(`user-${reviewerId}`)
      .emit(NEW_NOTIFICATION_EVENT, createdNotification);
  }

  async handleReportUpdated(data: ReportUpdatedEvent) {
    const existingReport = await this.db.query.postReports.findFirst({
      where: eq(schema.postReports.id, data.reportId),
      with: {
        reporter: true,
        post: true,
      },
    });
    const contentTriageMembers = await this.db.query.organizations.findFirst({
      where: eq(organizations.slug, 'content-triage-org'),
      with: {
        members: true,
      },
    });

    if (!existingReport) return;

    if (
      existingReport.actionTaken === postReportsActionTakenEnum.enumValues[1]
    ) {
      // "account_warned"
      const newNotification = await this.notificationsRepository.create({
        userId: existingReport.post.userId,
        actorId: existingReport.reviewedBy || existingReport.reporterId,
        type: notificationsTypeEnum.enumValues[15], // report_updated
        postId: existingReport.postId,
        content: `Your account has been warned for violating our post policies.`,
      });

      const createdNotification = await this.notificationsRepository.findFirst({
        where: eq(notifications.id, newNotification.id),
        with: {
          post: true,
        },
      });

      this.eventsGateWay.server
        .to(`user-${existingReport.post.userId}`)
        .emit(NEW_NOTIFICATION_EVENT, createdNotification);
    }

    const triageMembers =
      contentTriageMembers?.members.map((member) => member.userId) ?? [];

    triageMembers.map(async (triageMemberId) => {
      const newNotification = await this.notificationsRepository.create({
        userId: triageMemberId,
        actorId: existingReport.reporter.id,
        type: notificationsTypeEnum.enumValues[15], // report_updated
        reportId: existingReport.id,
        content: `has updated a post report "action taken" to ${existingReport.actionTaken}.`,
      });

      const createdNotification = await this.notificationsRepository.findFirst({
        where: eq(notifications.id, newNotification.id),
        with: {
          actor: true,
          report: true,
        },
      });

      this.eventsGateWay.server
        .to(`user-${triageMemberId}`)
        .emit(NEW_NOTIFICATION_EVENT, createdNotification);
    });
  }

  async findUserNotifications(
    findManyQueryDto: FindManyQueryDto,
    user: typeof users.$inferSelect,
  ) {
    return this.notificationsRepository.findMany(
      {
        where: eq(notifications.userId, user.id),
        orderBy: desc(notifications.createdAt),
        with: {
          actor: true,
          post: true,
          postCollab: true,
          postUserTag: true,
          report: true,
          comment: true,
        },
      },
      findManyQueryDto,
    );
  }

  async deleteNotification(
    notificationId: string,
    user: typeof users.$inferSelect,
  ) {
    const existingNotification = await this.notificationsRepository.findFirst({
      where: and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id),
      ),
    });

    if (!existingNotification)
      throw new NotFoundException('Notification not found.');

    await this.notificationsRepository.delete(notificationId);
  }
}
