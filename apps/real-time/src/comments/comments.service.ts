import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentsRepository } from '@/src/comments/comments.repository';
import { CommentLikesRepository } from '@/src/comments/comment-likes.repository';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  schema,
  comments,
  commentLikes,
  users,
  notificationsTypeEnum,
  notifications,
  posts,
  DATABASE_CONNECTION,
} from '@repo/database';
import { EventsGateway } from '@/src/events/providers/events.gateway';
import {
  COMMENT_DELETED_EVENT,
  COMMENT_LIKED_EVENT,
  COMMENT_UNLIKED_EVENT,
  COMMENT_UPDATED_EVENT,
  FindManyQueryDto,
  NEW_COMMENT_EVENT,
  NEW_NOTIFICATION_EVENT,
  SystemWideErrorCodes,
} from '@repo/types';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { CreateCommentDto } from '@/src/comments/dto/create-comment.dto';
import { NotificationsRepository } from '@/src/notifications/notifications.repository';
import { UpdateCommentDto } from '@/src/comments/dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly commentLikesRepository: CommentLikesRepository,
    private readonly notificationsRepository: NotificationsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventsGateWay: EventsGateway,
  ) {}

  /**
   * Create a new comment on a post
   */
  async createComment(
    createCommentDto: CreateCommentDto,
    user: typeof users.$inferSelect,
  ) {
    const { postId, parentCommentId, content } = createCommentDto;

    const [newComment] = await this.db
      .insert(comments)
      .values({
        postId,
        parentCommentId,
        userId: user.id,
        content,
      })
      .returning();

    if (!newComment) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.CREATION_FAILED,
        description: 'Failed to create comment',
      });
    }

    await this.db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
      })
      .where(eq(posts.id, postId));

    if (parentCommentId) {
      // Increment parent comment replies count
      await this.db
        .update(comments)
        .set({ repliesCount: sql`${comments.repliesCount} + 1` })
        .where(eq(comments.id, parentCommentId));
    }

    const fullComment = await this.db.query.comments.findFirst({
      where: eq(comments.id, newComment.id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        likes: true,
        post: {
          with: {
            user: true,
          },
        },
      },
    });

    if (fullComment) {
      const newNotification = await this.notificationsRepository.create({
        userId: fullComment.post.user.id,
        actorId: user.id,
        type: notificationsTypeEnum.enumValues[1], // comment
        commentId: fullComment.id,
        content: 'commented:',
      });

      const createdNotification = await this.notificationsRepository.findFirst({
        where: eq(notifications.id, newNotification.id),
        with: {
          actor: true,
          comment: true,
        },
      });

      this.eventsGateWay.server
        .to(`user-${fullComment.post.user.id}`)
        .emit(NEW_NOTIFICATION_EVENT, createdNotification);

      if (fullComment.parentCommentId) {
        const newNotification = await this.notificationsRepository.create({
          userId: fullComment.parentCommentId,
          actorId: user.id,
          type: notificationsTypeEnum.enumValues[7], // comment_reply
          commentId: fullComment.id,
          content: 'replied to your comment:',
        });

        const createdNotification =
          await this.notificationsRepository.findFirst({
            where: eq(notifications.id, newNotification.id),
            with: {
              actor: true,
              comment: true,
            },
          });

        this.eventsGateWay.server
          .to(`user-${fullComment.parentCommentId}`)
          .emit(NEW_NOTIFICATION_EVENT, createdNotification);
      }

      // Broadcast comment creation via WebSocket
      this.eventsGateWay.server
        .to(`post-${postId}`)
        .emit(NEW_COMMENT_EVENT, fullComment);

      return fullComment;
    }
  }

  /**
   * Get comments for a post (paginated)
   */
  async findPostComments(postId: string, findManyQueryDto: FindManyQueryDto) {
    const postComments = await this.db.query.comments.findMany({
      where: and(eq(comments.postId, postId), isNull(comments.parentCommentId)),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        likes: true,
        replies: true,
      },
      orderBy: desc(comments.createdAt),
      limit: findManyQueryDto.limit,
      offset: (findManyQueryDto.page - 1) * findManyQueryDto.limit,
    });

    return postComments;
  }

  /**
   * Get replies for a comment (paginated)
   */
  async findCommentReplies(
    commentId: string,
    findManyQueryDto: FindManyQueryDto,
  ) {
    // Verify comment exists
    const parentComment = await this.commentsRepository.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!parentComment) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Comment not found.',
      });
    }

    const replies = await this.db.query.comments.findMany({
      where: eq(comments.parentCommentId, commentId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        likes: true,
      },
      orderBy: desc(comments.createdAt),
      limit: findManyQueryDto.limit,
      offset: (findManyQueryDto.page - 1) * findManyQueryDto.limit,
    });

    return replies;
  }

  /**
   * Get a single comment by ID
   */
  async findCommentById(commentId: string) {
    const comment = await this.db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        likes: true,
        replies: true,
      },
    });

    if (!comment) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Comment not found.',
      });
    }

    return comment;
  }

  /**
   * Update comment content
   */
  async updateComment(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    user: typeof users.$inferSelect,
  ) {
    const { content } = updateCommentDto;

    const existingComment = await this.commentsRepository.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!existingComment) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Comment not found.',
      });
    }

    if (existingComment.userId !== user.id) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'You can only edit your own comments.',
      });
    }

    const [updatedComment] = await this.db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, commentId))
      .returning();

    if (!updatedComment) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
        description: 'Failed to update comment.',
      });
    }

    const fullComment = await this.findCommentById(commentId);

    // Broadcast comment update via WebSocket
    this.eventsGateWay.server
      .to(`post-${updatedComment.postId}`)
      .emit(COMMENT_UPDATED_EVENT, fullComment);

    return fullComment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, user: typeof users.$inferSelect) {
    const existingComment = await this.commentsRepository.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!existingComment) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Comment not found.',
      });
    }

    if (existingComment.userId !== user.id) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'You can only delete your own comments.',
      });
    }

    const [deletedComment] = await this.db
      .delete(comments)
      .where(eq(comments.id, commentId))
      .returning();

    if (!deletedComment) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.DELETION_FAILED,
        description: 'Failed to delete comment.',
      });
    }

    await this.db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} - 1`,
      })
      .where(eq(posts.id, deletedComment.postId));

    // If this was a reply, decrement parent comment replies count
    if (existingComment.parentCommentId) {
      await this.db
        .update(comments)
        .set({ repliesCount: sql`${comments.repliesCount} - 1` })
        .where(eq(comments.id, existingComment.parentCommentId));
    }

    // Broadcast comment deletion via WebSocket
    this.eventsGateWay.server
      .to(`post-${deletedComment.postId}`)
      .emit(COMMENT_DELETED_EVENT, {
        commentId,
        postId: deletedComment.postId,
      });

    return deletedComment;
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string, user: typeof users.$inferSelect) {
    const existingComment = await this.commentsRepository.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!existingComment) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Comment not found.',
      });
    }

    // Check if already liked
    const existingLike = await this.commentLikesRepository.findFirst({
      where: and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.userId, user.id),
      ),
    });

    if (existingLike) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'You have already liked this comment.',
      });
    }

    const [like] = await this.db
      .insert(commentLikes)
      .values({
        commentId,
        userId: user.id,
      })
      .returning();

    if (!like) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'Failed to like comment.',
      });
    }

    // Increment comment likes count
    await this.db
      .update(comments)
      .set({ likesCount: sql`${comments.likesCount} + 1` })
      .where(eq(comments.id, commentId));

    // Broadcast like via WebSocket
    this.eventsGateWay.server
      .to(`post-${existingComment.postId}`)
      .emit(COMMENT_LIKED_EVENT, like);

    return like;
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string, user: typeof users.$inferSelect) {
    const existingComment = await this.commentsRepository.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!existingComment) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Comment not found.',
      });
    }

    const existingLike = await this.commentLikesRepository.findFirst({
      where: and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.userId, user.id),
      ),
    });

    if (!existingLike) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.BAD_REQUEST,
        description: 'You have not liked this comment.',
      });
    }

    const [like] = await this.db
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, user.id),
        ),
      )
      .returning();

    // Decrement comment likes count
    await this.db
      .update(comments)
      .set({ likesCount: sql`${comments.likesCount} - 1` })
      .where(eq(comments.id, commentId));

    // Broadcast unlike via WebSocket
    this.eventsGateWay.server
      .to(`post-${existingComment.postId}`)
      .emit(COMMENT_UNLIKED_EVENT, like);

    return like;
  }
}
