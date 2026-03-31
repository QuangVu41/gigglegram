import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommentsService } from '@/src/comments/comments.service';
import { CreateCommentDto } from '@/src/comments/dto/create-comment.dto';
import { UpdateCommentDto } from '@/src/comments/dto/update-comment.dto';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';
import { FindManyQueryDto } from '@repo/types';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a new comment on a post
   * POST /comments
   */
  @Post()
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.commentsService.createComment(createCommentDto, user);
  }

  /**
   * Get all comments for a specific post (paginated)
   * GET /comments/post/:postId
   */
  @Get('post/{:postId}')
  async findPostComments(
    @Param('postId') postId: string,
    @Query() findManyQueryDto: FindManyQueryDto,
  ) {
    return this.commentsService.findPostComments(postId, findManyQueryDto);
  }

  /**
   * Get all replies for a specific comment (paginated)
   * GET /comments/:commentId/replies
   */
  @Get('{:commentId}/replies')
  async findCommentReplies(
    @Param('commentId') commentId: string,
    @Query() findManyQueryDto: FindManyQueryDto,
  ) {
    return this.commentsService.findCommentReplies(commentId, findManyQueryDto);
  }

  /**
   * Get a single comment by ID
   * GET /comments/:commentId
   */
  @Get('{:commentId}')
  async findCommentById(@Param('commentId') commentId: string) {
    return this.commentsService.findCommentById(commentId);
  }

  /**
   * Update a comment
   * PATCH /comments/:commentId
   */
  @Patch('{:commentId}')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.commentsService.updateComment(
      commentId,
      updateCommentDto,
      user,
    );
  }

  /**
   * Delete a comment
   * DELETE /comments/:commentId
   */
  @Delete('{:commentId}')
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.commentsService.deleteComment(commentId, user);
  }

  /**
   * Like a comment
   * POST /comments/:commentId/like
   */
  @Post('{:commentId}/like')
  async likeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.commentsService.likeComment(commentId, user);
  }

  /**
   * Unlike a comment
   * DELETE /comments/:commentId/like
   */
  @Delete('{:commentId}/like')
  async unlikeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.commentsService.unlikeComment(commentId, user);
  }
}
