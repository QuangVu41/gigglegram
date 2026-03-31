import {
  DATABASE_CONNECTION,
  followers,
  likes,
  postHashtags,
  posts,
  PostsRepository,
  schema,
  users,
} from '@repo/database';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { FindManyQueryDto, PostCreatedEvent } from '@repo/types';
import { type Cache } from 'cache-manager';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { FindFeedForUserDto } from '@/src/dto/find-feed-for-user.dto';
import { notInArray } from 'drizzle-orm';
import { FindSuggestedPostsForUserDto } from '@/src/dto/find-suggested-posts-for-user.dto';
import { gte } from 'drizzle-orm';
import { and } from 'drizzle-orm';
import { FindSuggestedReelsForUserDto } from '@/src/dto/find-suggested-reels-for-user.dto';

@Injectable()
export class FeedService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly postsRepository: PostsRepository,
  ) {}

  async handlePostCreated(data: PostCreatedEvent) {
    const existingPost = await this.postsRepository.findFirst({
      where: eq(posts.id, data.postId),
      with: {
        user: {
          with: {
            following: {
              columns: {
                followerId: true,
              },
            },
          },
        },
      },
    });
    if (!existingPost) return;

    if (existingPost.user.following.length > 1000) return;

    const ttl = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds

    await Promise.all(
      existingPost.user.following.map(async (follower) => {
        const existingFeed = await this.cacheManager.get<string[]>(
          `feed:user:${follower.followerId}`,
        );
        if (existingFeed)
          return this.cacheManager.set(
            `feed:user:${follower.followerId}`,
            [data.postId, ...existingFeed],
            ttl,
          );

        await this.cacheManager.set(
          `feed:user:${follower.followerId}`,
          [data.postId],
          ttl,
        );
      }),
    );
  }

  async findFeedForUser(
    findFeedForUserDto: FindFeedForUserDto,
    user: typeof users.$inferSelect,
  ) {
    const feedKey = `feed:user:${user.id}`;
    const cachedUserFeed = await this.cacheManager.get<string[]>(feedKey);
    const cachedSuggestedPosts = await this.getSuggestedPostIdsForUser(user.id);

    const followingPostIds = (
      await this.db.query.followers.findMany({
        where: eq(followers.followerId, user.id),
        with: {
          following: {
            with: {
              posts: {
                columns: {
                  id: true,
                },
                limit: 4,
                where: cachedUserFeed
                  ? notInArray(posts.id, cachedUserFeed)
                  : undefined,
              },
            },
          },
        },
      })
    )
      .flatMap((f) => f.following.posts)
      .map((p) => p.id);

    const mergedPostIds = cachedUserFeed
      ? [
          ...new Set([
            ...cachedUserFeed,
            ...cachedSuggestedPosts,
            ...followingPostIds,
          ]),
        ]
      : [...cachedSuggestedPosts, ...followingPostIds];

    if (mergedPostIds.length === 0)
      return this.getDefaultSuggestedPosts(findFeedForUserDto);

    const userFeed = await this.postsRepository.findMany(
      {
        where: inArray(posts.id, mergedPostIds),
        with: {
          user: true,
          location: true,
          postCollaborators: true,
          postHashtags: true,
          postMedia: true,
          postUserTags: true,
          savedPosts: true,
          likes: true,
        },
        orderBy: desc(posts.createdAt),
      },
      findFeedForUserDto,
    );

    return userFeed;
  }

  async findSuggestedPostsForUser(
    findSuggestedPostsForUserDto: FindSuggestedPostsForUserDto,
    user: typeof users.$inferSelect,
  ) {
    const suggestedPostIds = await this.getSuggestedPostIdsForUser(user.id);

    if (suggestedPostIds.length === 0)
      return this.getDefaultSuggestedPosts(findSuggestedPostsForUserDto);

    const suggestedPosts = await this.postsRepository.findMany(
      {
        where: inArray(posts.id, suggestedPostIds),
        with: {
          user: true,
          location: true,
          postCollaborators: true,
          postHashtags: true,
          postMedia: true,
          postUserTags: true,
          savedPosts: true,
          likes: true,
        },
        orderBy: desc(posts.createdAt),
      },
      findSuggestedPostsForUserDto,
    );

    return suggestedPosts;
  }

  async findSuggestedReelsForUser(
    findSuggestedReelsForUserDto: FindSuggestedReelsForUserDto,
    user: typeof users.$inferSelect,
  ) {
    const suggestedReelIds = await this.getSuggestedPostIdsForUser(
      user.id,
      true,
    );

    if (suggestedReelIds.length === 0)
      return this.getDefaultSuggestedPosts(findSuggestedReelsForUserDto, true);

    const suggestedReels = await this.postsRepository.findMany(
      {
        where: inArray(posts.id, suggestedReelIds),
        with: {
          user: true,
          location: true,
          postCollaborators: true,
          postHashtags: true,
          postMedia: true,
          postUserTags: true,
          savedPosts: true,
          likes: true,
        },
        orderBy: desc(posts.createdAt),
      },
      findSuggestedReelsForUserDto,
    );

    return suggestedReels;
  }

  private async getDefaultSuggestedPosts(
    findManyQueryDto: FindManyQueryDto,
    onlyReels: boolean = false,
  ) {
    const suggestedPosts = await this.postsRepository.findMany(
      {
        where: and(
          gte(posts.likesCount, 0),
          onlyReels ? eq(posts.isReel, onlyReels) : undefined,
        ),
        orderBy: desc(posts.likesCount),
        with: {
          user: true,
          location: true,
          postCollaborators: true,
          postHashtags: true,
          postMedia: true,
          postUserTags: true,
          savedPosts: true,
          likes: true,
        },
      },
      findManyQueryDto,
    );

    return suggestedPosts;
  }

  private async getSuggestedPostIdsForUser(
    userId: string,
    onlyReels: boolean = false,
  ) {
    const cachedSuggestedPosts = await this.cacheManager.get<string[]>(
      `suggested-posts:user:${userId}`,
    );

    if (cachedSuggestedPosts) {
      return cachedSuggestedPosts;
    }

    const hashtagsIdOfRecentlyLikedPosts = (
      await this.db.query.likes.findMany({
        where: eq(likes.userId, userId),
        columns: {},
        with: {
          post: {
            columns: {},
            with: {
              postHashtags: {
                columns: {
                  hashtagId: true,
                },
              },
            },
          },
        },
        orderBy: desc(likes.createdAt),
        limit: 20,
      })
    ).flatMap((like) => like.post.postHashtags.map((ph) => ph.hashtagId));

    const suggestedPosts = await this.db.query.posts.findMany({
      where: onlyReels ? eq(posts.isReel, onlyReels) : undefined,
      columns: {
        id: true,
      },
      with: {
        postHashtags: {
          columns: {},
          where: inArray(
            postHashtags.hashtagId,
            hashtagsIdOfRecentlyLikedPosts,
          ),
        },
      },
    });

    await this.cacheManager.set(
      `suggested-posts:user:${userId}`,
      suggestedPosts.map((p) => p.id),
      60 * 60 * 1000, // 1 hour in milliseconds
    );

    return suggestedPosts.map((p) => p.id);
  }
}
