import { Module } from '@nestjs/common';
import { CommentsController } from '@/src/comments/comments.controller';
import { CommentsRepository } from '@/src/comments/comments.repository';
import { CommentLikesRepository } from '@/src/comments/comment-likes.repository';
import { CommentsService } from '@/src/comments/comments.service';
import { NotificationsRepository } from '@/src/notifications/notifications.repository';

@Module({
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentsRepository,
    CommentLikesRepository,
    NotificationsRepository,
  ],
})
export class CommentsModule {}
