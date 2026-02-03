import {
  audioTracks,
  DATABASE_CONNECTION,
  hashtags,
  locations,
  postCollaborators,
  postHashtags,
  postMedia,
  posts,
  schema,
} from '@repo/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PostCreatedEvent,
  PostDeletedEvent,
  PostUpdatedEvent,
} from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';
import { and } from 'drizzle-orm';
import { UploadService } from '@repo/common';

@Injectable()
export class PostEngsService {
  private readonly logger = new Logger(PostEngsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly uploadService: UploadService,
  ) {}

  async handlePostCreated(data: PostCreatedEvent) {
    try {
      const createdPost = await this.db.query.posts.findFirst({
        where: eq(posts.id, data.postId),
        with: {
          postHashtags: {
            columns: {},
            with: {
              hashtag: {
                columns: { id: true, postsCount: true },
              },
            },
          },
          audioTrack: {
            columns: { id: true, usageCount: true },
          },
          location: {
            columns: { id: true, postsCount: true },
          },
        },
      });

      if (!createdPost)
        return this.logger.warn(`Post with ID ${data.postId} not found.`);

      await this.db.transaction(async (tx) => {
        try {
          await Promise.all([
            ...createdPost.postHashtags.map(async ({ hashtag }) => {
              await tx
                .update(hashtags)
                .set({ postsCount: hashtag.postsCount + 1 })
                .where(eq(hashtags.id, hashtag.id));
            }),
            createdPost.audioId && createdPost.audioTrack
              ? tx
                  .update(audioTracks)
                  .set({ usageCount: createdPost.audioTrack.usageCount + 1 })
                  .where(eq(audioTracks.id, createdPost.audioTrack.id))
              : Promise.resolve(),
            createdPost.locationId && createdPost.location
              ? tx
                  .update(locations)
                  .set({ postsCount: createdPost.location.postsCount + 1 })
                  .where(eq(schema.locations.id, createdPost.location.id))
              : Promise.resolve(),
          ]);
        } catch (error) {
          this.logger.error(
            'Error updating hashtags posts count transaction.',
            error,
          );
          throw error;
        }
      });
      this.logger.log(
        `Successfully handled post created event for post ID ${data.postId}.`,
      );
    } catch (error) {
      this.logger.error('Error handling post created event.', error);
    }
  }

  async handlePostUpdated(data: PostUpdatedEvent) {
    try {
      const [
        updatedPost,
        newHashtags,
        deletingPostHashtags,
        deletingPostCollaborators,
      ] = await Promise.all([
        this.db.query.posts.findFirst({
          where: eq(posts.id, data.postId),
          with: { location: { columns: { postsCount: true } } },
        }),
        this.db.query.hashtags.findMany({
          where: inArray(hashtags.id, data.newHashtagIds),
        }),
        this.db.query.postHashtags.findMany({
          where: and(
            inArray(postHashtags.hashtagId, data.deletingHashtagIds),
            eq(postHashtags.postId, data.postId),
          ),
          with: {
            hashtag: {
              columns: { postsCount: true },
            },
          },
        }),
        this.db.query.postCollaborators.findMany({
          where: and(
            inArray(postCollaborators.userId, data.deletingCollaboratorIds),
            eq(postCollaborators.postId, data.postId),
          ),
        }),
      ]);

      if (!updatedPost)
        this.logger.warn(`Post with ID ${data.postId} not found.`);

      if (!(newHashtags.length > 0))
        this.logger.warn(
          `No existing hashtags found for the given IDs: ${data.newHashtagIds.join(', ')}.`,
        );

      if (!(deletingPostHashtags.length > 0))
        this.logger.warn(
          `No existing post hashtags found for the given IDs: ${data.deletingHashtagIds.join(', ')}.`,
        );

      if (!(deletingPostCollaborators.length > 0))
        this.logger.warn(
          `No existing post collaborators found for the given IDs: ${data.deletingCollaboratorIds.join(', ')}.`,
        );

      await this.db.transaction(async (tx) => {
        try {
          await Promise.all([
            ...newHashtags.map(async (hashtag) => {
              await tx
                .update(hashtags)
                .set({ postsCount: hashtag.postsCount + 1 })
                .where(eq(hashtags.id, hashtag.id));
            }),
            ...deletingPostHashtags.map(async (postHashtag) => {
              await tx
                .update(hashtags)
                .set({
                  postsCount: Math.max(0, postHashtag.hashtag.postsCount - 1),
                })
                .where(eq(hashtags.id, postHashtag.hashtagId));
              await tx
                .delete(postHashtags)
                .where(eq(postHashtags.id, postHashtag.id));
            }),
            ...deletingPostCollaborators.map(async (postCollaborator) => {
              await tx
                .delete(postCollaborators)
                .where(eq(postCollaborators.id, postCollaborator.id));
            }),
          ]);
        } catch (error) {
          this.logger.error(
            'Error updating hashtags posts count transaction.',
            error,
          );
          throw error;
        }
      });
      this.logger.log(
        `Successfully handled post updated event for post ID ${data.postId}.`,
      );
    } catch (error) {
      this.logger.error('Error handling post updated event.', error);
    }
  }

  async handlePostDeleted(
    data: PostDeletedEvent<
      Pick<typeof postMedia.$inferSelect, 'mediaType' | 'originalRawFileUrl'>[]
    >,
  ) {
    try {
      const [existingHashtags, existingLocation, existingAudio] =
        await Promise.all([
          this.db.query.hashtags.findMany({
            where: inArray(hashtags.id, data.hashtagIds),
          }),
          data.locationId
            ? this.db.query.locations.findFirst({
                where: eq(locations.id, data.locationId),
              })
            : null,
          data.audioId
            ? this.db.query.audioTracks.findFirst({
                where: eq(audioTracks.id, data.audioId),
              })
            : null,
        ]);

      if (!(existingHashtags.length > 0))
        this.logger.warn(
          `No existing hashtags found for the given IDs: ${data.hashtagIds.join(', ')}.`,
        );

      await this.db.transaction(async (tx) => {
        try {
          await Promise.all([
            ...existingHashtags.map(async (hashtag) => {
              await tx
                .update(hashtags)
                .set({
                  postsCount: Math.max(0, hashtag.postsCount - 1),
                })
                .where(eq(hashtags.id, hashtag.id));
            }),
            existingLocation &&
              tx
                .update(locations)
                .set({
                  postsCount: Math.max(0, existingLocation.postsCount - 1),
                })
                .where(eq(locations.id, existingLocation.id)),
            existingAudio &&
              tx
                .update(audioTracks)
                .set({
                  usageCount: Math.max(0, existingAudio.usageCount - 1),
                })
                .where(eq(audioTracks.id, existingAudio.id)),
            ...data.postMediaData.map(async (media) => {
              await this.uploadService.deleteFile(
                media.originalRawFileUrl,
                media.mediaType,
              );
            }),
          ]);
        } catch (error) {
          this.logger.error(
            'Error updating hashtags posts count transaction.',
            error,
          );
          throw error;
        }
      });
      this.logger.log(
        `Successfully handled post deleted event for post ID ${data.postId}.`,
      );
    } catch (error) {
      this.logger.error('Error handling post deleted event.', error);
      throw error;
    }
  }
}
