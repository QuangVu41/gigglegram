import {
  DATABASE_CONNECTION,
  followers,
  likes,
  postHashtags,
  posts,
  stories,
  PostsRepository,
  schema,
  users,
  postMedia,
} from '@repo/database';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import {
  FindManyQueryDto,
  PostCreatedEvent,
  ReelWatched5sEvent,
} from '@repo/types';
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
import { FindStoriesFeedForUserDto } from '@/src/dto/find-stories-feed-for-user.dto';
import { or } from 'drizzle-orm';
import { ne } from 'drizzle-orm';

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
            followers: {
              columns: {
                followerId: true,
              },
            },
          },
        },
      },
    });
    if (!existingPost) return;

    if (existingPost.user.followers.length > 1000) return;

    const ttl = 60 * 60 * 24 * 7 * 1000; // 7 days in milliseconds

    const existingUserFeed = await this.cacheManager.get<string[]>(
      `feed:user:${existingPost.userId}`,
    );
    if (existingUserFeed)
      await this.cacheManager.set(
        `feed:user:${existingPost.userId}`,
        [data.postId, ...existingUserFeed],
        ttl,
      );
    else {
      await this.cacheManager.set(
        `feed:user:${existingPost.userId}`,
        [data.postId],
        ttl,
      );
    }

    // Invalidate suggested posts cache for the creator
    await this.cacheManager.del(`suggested-posts:user:${existingPost.userId}`);

    await Promise.all(
      existingPost.user.followers.map(async (follower) => {
        const existingFeed = await this.cacheManager.get<string[]>(
          `feed:user:${follower.followerId}`,
        );

        // Invalidate suggested posts/reels cache for followers
        await this.cacheManager.del(
          `suggested-posts:user:${follower.followerId}`,
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
                where:
                  cachedUserFeed && cachedUserFeed.length > 0
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
        where: and(
          or(inArray(posts.id, mergedPostIds), eq(posts.userId, user.id)),
          eq(posts.isArchived, false),
        ),
        with: {
          user: { with: { userPrivacySetting: true } },
          location: true,
          postCollaborators: { with: { user: true } },
          postHashtags: true,
          postMedia: true,
          postUserTags: { with: { user: true } },
          savedPosts: true,
          likes: { with: { user: true }, limit: 1 },
          audioTrack: {
            with: {
              uploader: true,
            },
          },
        },
        orderBy: desc(posts.createdAt),
      },
      findFeedForUserDto,
    );

    return userFeed;
  }

  async findStoriesFeedForUser(
    findStoriesFeedForUserDto: FindStoriesFeedForUserDto,
    user: typeof users.$inferSelect,
  ) {
    const followingPostIds = (
      await this.db.query.followers.findMany({
        where: eq(followers.followerId, user.id),
        columns: { followingId: true },
      })
    ).map((f) => f.followingId);

    const usersWithStories = await this.db.query.users.findMany({
      where: inArray(users.id, [user.id, ...followingPostIds]),
      with: {
        stories: {
          where: and(
            eq(stories.status, 'published'),
            gte(stories.expiresAt, new Date()),
          ),
          orderBy: desc(stories.createdAt),
        },
      },
    });

    const activeStoryUsers = usersWithStories.filter(
      (u) => u.stories.length > 0 || u.id === user.id,
    );

    activeStoryUsers.sort((a, b) => {
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      const aLatest = a.stories[0]?.createdAt.getTime() || 0;
      const bLatest = b.stories[0]?.createdAt.getTime() || 0;
      return bLatest - aLatest;
    });

    const limit = findStoriesFeedForUserDto.limit || 20;
    const page = findStoriesFeedForUserDto.page || 1;
    const skip = (page - 1) * limit;

    return activeStoryUsers.slice(skip, skip + limit);
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
        where: and(
          inArray(posts.id, suggestedPostIds),
          eq(posts.isArchived, false),
        ),
        with: {
          user: { with: { userPrivacySetting: true } },
          location: true,
          postCollaborators: { with: { user: true } },
          postHashtags: true,
          postMedia: true,
          postUserTags: { with: { user: true } },
          savedPosts: true,
          likes: { with: { user: true }, limit: 1 },
          audioTrack: {
            with: {
              uploader: true,
            },
          },
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
        where: and(
          inArray(posts.id, suggestedReelIds),
          eq(posts.isReel, true),
          eq(posts.isArchived, false),
        ),
        with: {
          user: { with: { userPrivacySetting: true } },
          location: true,
          postCollaborators: { with: { user: true } },
          postHashtags: true,
          postMedia: true,
          postUserTags: { with: { user: true } },
          savedPosts: true,
          likes: { with: { user: true }, limit: 1 },
          audioTrack: {
            with: {
              uploader: true,
            },
          },
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
          eq(posts.isArchived, false),
        ),
        orderBy: desc(posts.likesCount),
        with: {
          user: { with: { userPrivacySetting: true } },
          location: true,
          postCollaborators: { with: { user: true } },
          postHashtags: true,
          postMedia: true,
          postUserTags: { with: { user: true } },
          savedPosts: true,
          likes: { with: { user: true }, limit: 1 },
          audioTrack: {
            with: {
              uploader: true,
            },
          },
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

    const followingIds = (
      await this.db.query.followers.findMany({
        where: eq(followers.followerId, userId),
        columns: {
          followingId: true,
        },
      })
    ).map((f) => f.followingId);

    const hashtagsIdOfRecentlyLikedPosts = (
      await this.db.query.likes.findMany({
        where: eq(likes.userId, userId),
        columns: {
          id: true,
        },
        with: {
          post: {
            columns: {
              id: true,
            },
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

    const suggestedPosts = await this.db
      .selectDistinct({ id: posts.id, createdAt: posts.createdAt })
      .from(posts)
      .leftJoin(postHashtags, eq(posts.id, postHashtags.postId))
      .where(
        and(
          onlyReels ? eq(posts.isReel, onlyReels) : undefined,
          or(
            followingIds.length > 0
              ? inArray(posts.userId, followingIds)
              : undefined,
            hashtagsIdOfRecentlyLikedPosts.length > 0
              ? inArray(postHashtags.hashtagId, hashtagsIdOfRecentlyLikedPosts)
              : undefined,
          ),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(100);

    const suggestedPostIds = suggestedPosts.map((p) => p.id);

    await this.cacheManager.set(
      `suggested-posts:user:${userId}`,
      suggestedPostIds,
      60 * 60 * 1000, // 1 hour in milliseconds
    );

    return suggestedPostIds;
  }

  async handleReelWatched5s(data: ReelWatched5sEvent) {
    const { reelId, userId } = data;

    // 1. Get hashtagIds of the watched reel
    const watchedPostHashtags = await this.db
      .select({ hashtagId: postHashtags.hashtagId })
      .from(postHashtags)
      .where(eq(postHashtags.postId, reelId));

    const hashtagIds = watchedPostHashtags.map((h) => h.hashtagId);

    const similarReelIds: string[] = [];

    if (hashtagIds.length > 0) {
      // Query for active reels that share at least one hashtag
      const similarReels = await this.db
        .select({ id: posts.id })
        .from(posts)
        .leftJoin(postHashtags, eq(posts.id, postHashtags.postId))
        .where(
          and(
            eq(posts.isReel, true),
            eq(posts.isArchived, false),
            ne(posts.id, reelId),
            inArray(postHashtags.hashtagId, hashtagIds),
          ),
        );

      for (const reel of similarReels) {
        if (!similarReelIds.includes(reel.id)) {
          similarReelIds.push(reel.id);
        }
      }
    }

    // 2. Fallback: all reels by the same author
    if (similarReelIds.length === 0) {
      const watchedPost = await this.db.query.posts.findFirst({
        where: eq(posts.id, reelId),
        columns: { userId: true },
      });
      if (watchedPost) {
        const fallbackReels = await this.db
          .select({ id: posts.id })
          .from(posts)
          .where(
            and(
              eq(posts.isReel, true),
              eq(posts.isArchived, false),
              ne(posts.id, reelId),
              eq(posts.userId, watchedPost.userId),
            ),
          );
        for (const reel of fallbackReels) {
          if (!similarReelIds.includes(reel.id)) {
            similarReelIds.push(reel.id);
          }
        }
      }
    }

    // 3. Absolute Fallback: recent active reels (capped at 50 for database health)
    if (similarReelIds.length === 0) {
      const fallbackReels = await this.db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.isReel, true),
            eq(posts.isArchived, false),
            ne(posts.id, reelId),
          ),
        )
        .orderBy(desc(posts.createdAt))
        .limit(50);
      for (const reel of fallbackReels) {
        if (!similarReelIds.includes(reel.id)) {
          similarReelIds.push(reel.id);
        }
      }
    }

    if (similarReelIds.length > 0) {
      const cacheKey = `suggested-posts:user:${userId}`;
      let cachedIds = await this.cacheManager.get<string[]>(cacheKey);
      if (!cachedIds) {
        cachedIds = [];
      }

      // Filter out recommended IDs that are already present in the user's cached suggested posts
      const newIdsToPrepend = similarReelIds.filter(
        (id) => !cachedIds.includes(id),
      );

      if (newIdsToPrepend.length > 0) {
        // Prepend all new similar reel IDs at the beginning of the suggestions array
        cachedIds.unshift(...newIdsToPrepend);
        await this.cacheManager.set(cacheKey, cachedIds, 60 * 60 * 1000);
      }
    }
  }
}
