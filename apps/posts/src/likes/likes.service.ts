import { DATABASE_CONNECTION, schema } from '@repo/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { LikeAPostDto } from '@/src/likes/dto/like-a-post.dto';
import { and, eq } from 'drizzle-orm';
import {
  KAFKA_SERVICE_NAME,
  PostLikedEvent,
  POSTS_TOPIC_POST_LIKED,
  SystemWideErrorCodes,
} from '@repo/types';
import { type ClientKafkaProxy } from '@nestjs/microservices';

@Injectable()
export class LikesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafkaProxy,
  ) {}

  async likePost(likeAPostDto: LikeAPostDto) {
    const existingPost = await this.db.query.posts.findFirst({
      where: eq(schema.posts.id, likeAPostDto.postId),
    });

    if (!existingPost)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post not found.',
      });

    const [result] = await this.db
      .insert(schema.likes)
      .values({
        postId: likeAPostDto.postId,
        userId: likeAPostDto.userId,
      })
      .onConflictDoNothing()
      .returning();

    await this.db
      .update(schema.posts)
      .set({
        likesCount: existingPost.likesCount + 1,
      })
      .where(eq(schema.posts.id, likeAPostDto.postId))
      .returning();

    this.kafkaClient.emit(
      POSTS_TOPIC_POST_LIKED,
      new PostLikedEvent(existingPost.id, likeAPostDto.userId),
    );

    return result;
  }

  async unlikePost(likeAPostDto: LikeAPostDto) {
    const existingPost = await this.db.query.posts.findFirst({
      where: eq(schema.posts.id, likeAPostDto.postId),
    });

    if (!existingPost)
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post not found.',
      });

    const [result] = await this.db
      .delete(schema.likes)
      .where(
        and(
          eq(schema.likes.postId, likeAPostDto.postId),
          eq(schema.likes.userId, likeAPostDto.userId),
        ),
      )
      .returning();

    await this.db
      .update(schema.posts)
      .set({
        likesCount: Math.max(0, existingPost.likesCount - 1),
      })
      .where(eq(schema.posts.id, likeAPostDto.postId))
      .returning();

    return result;
  }
}
