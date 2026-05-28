import {
  audioTracks,
  DATABASE_CONNECTION,
  hashtags,
  locations,
  postCollaborators,
  postHashtags,
  postMedia,
  posts,
  postUserTags,
  savedCollections,
  schema,
  userPrivacySettingsWhoCanMentionEnum,
  userPrivacySettingsWhoCanTagEnum,
  users,
} from '@repo/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PostCreatedEvent,
  PostDeletedEvent,
  PostSavedEvent,
  PostUnsavedEvent,
  PostUpdatedEvent,
  PostViewedEvent,
} from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { ModerationService, UploadService } from '@repo/common';
import { ClientKafka, KafkaContext } from '@nestjs/microservices';
import {
  KAFKA_SERVICE_NAME,
  MediaViolationEvent,
  NOTIFICATIONS_TOPIC_MEDIA_VIOLATION,
} from '@repo/types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostEngsService {
  private readonly logger = new Logger(PostEngsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafka,
    private readonly uploadService: UploadService,
    private readonly moderationService: ModerationService,
    private readonly configService: ConfigService,
  ) {}

  async handlePostCreated(data: PostCreatedEvent, context: KafkaContext) {
    try {
      const heartbeat = context.getHeartbeat();
      const createdPost = await this.db.query.posts.findFirst({
        where: eq(posts.id, data.postId),
        with: {
          user: {
            with: {
              following: true,
            },
          },
          postMedia: {
            columns: {
              id: true,
              mediaUrl: true,
              mediaType: true,
              originalRawFileUrl: true,
            },
          },
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
          postCollaborators: {
            columns: {
              id: true,
            },
            with: {
              user: {
                with: {
                  userPrivacySetting: true,
                  userNotificationSetting: true,
                },
              },
            },
          },
          postUserTags: {
            columns: {
              id: true,
            },
            with: {
              user: {
                with: {
                  userPrivacySetting: true,
                  userNotificationSetting: true,
                },
              },
            },
          },
        },
      });
      let deletingPostCollaboratorsIds: string[] = [];
      let deletingPostUserTagsIds: string[] = [];

      if (!createdPost)
        return this.logger.warn(`Post with ID ${data.postId} not found.`);

      if (createdPost.postMedia.length) {
        for (const media of createdPost.postMedia) {
          let res: { isSafe: boolean; reason?: string };

          if (media.mediaType.startsWith('image/')) {
            const safetyRes = await this.moderationService.checkImageSafety(
              media.originalRawFileUrl,
              this.configService.getOrThrow('GOOGLE_IMAGES_BUCKET_NAME'),
            );
            res = {
              isSafe: safetyRes.isSafe,
              reason: safetyRes.isSafe
                ? undefined
                : 'Potential unsafe image content detected',
            };
          } else {
            res = await this.moderationService.checkVideoSafety(
              media.originalRawFileUrl,
              this.configService.getOrThrow('GOOGLE_INPUT_VIDEO_BUCKET_NAME'),
            );
          }

          this.logger.log(
            `Moderation result for ${media.id}: ${JSON.stringify(res)}`,
          );

          if (!res.isSafe) {
            await this.db
              .update(postMedia)
              .set({
                moderationStatus: 'flagged',
                moderationReason: res.reason || 'Safety violation detected',
              })
              .where(eq(postMedia.id, media.id));

            this.kafkaClient.emit(NOTIFICATIONS_TOPIC_MEDIA_VIOLATION, {
              postId: data.postId,
              mediaId: media.id,
              userId: createdPost.userId,
              reason: res.reason || 'Safety violation detected',
            } as MediaViolationEvent);
          }
        }
      }

      await heartbeat();

      deletingPostCollaboratorsIds = createdPost.postCollaborators
        .filter(
          (pc) =>
            pc.user.userPrivacySetting?.whoCanMention ===
              userPrivacySettingsWhoCanMentionEnum.enumValues[2] ||
            (pc.user.userPrivacySetting?.whoCanMention ===
              userPrivacySettingsWhoCanMentionEnum.enumValues[1] &&
              !createdPost.user.following.some(
                (f) => f.followingId === pc.user.id,
              )),
        )
        .map((pc) => pc.id);
      deletingPostUserTagsIds = createdPost.postUserTags
        .filter(
          (put) =>
            put.user.userPrivacySetting?.whoCanTag ===
              userPrivacySettingsWhoCanTagEnum.enumValues[2] ||
            (put.user.userPrivacySetting?.whoCanTag ===
              userPrivacySettingsWhoCanTagEnum.enumValues[1] &&
              !createdPost.user.following.some(
                (f) => f.followingId === put.user.id,
              )),
        )
        .map((put) => put.id);

      await this.db.transaction(async (tx) => {
        try {
          await Promise.all([
            tx
              .update(users)
              .set({ postsCount: sql`${users.postsCount} + 1` })
              .where(eq(users.id, createdPost.userId)),
            ...createdPost.postHashtags.map(async ({ hashtag }) => {
              await tx
                .update(hashtags)
                .set({ postsCount: sql`${hashtags.postsCount} + 1` })
                .where(eq(hashtags.id, hashtag.id));
            }),
            createdPost.audioId && createdPost.audioTrack
              ? tx
                  .update(audioTracks)
                  .set({ usageCount: sql`${audioTracks.usageCount} + 1` })
                  .where(eq(audioTracks.id, createdPost.audioTrack.id))
              : Promise.resolve(),
            createdPost.locationId && createdPost.location
              ? tx
                  .update(locations)
                  .set({ postsCount: sql`${locations.postsCount} + 1` })
                  .where(eq(schema.locations.id, createdPost.location.id))
              : Promise.resolve(),
            ...deletingPostCollaboratorsIds.map(async (postCollaboratorId) => {
              await tx
                .delete(postCollaborators)
                .where(eq(postCollaborators.id, postCollaboratorId));
            }),
            ...deletingPostUserTagsIds.map(async (postUserTagId) => {
              await tx
                .delete(postUserTags)
                .where(eq(postUserTags.id, postUserTagId));
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
          with: {
            location: { columns: { postsCount: true } },
            postCollaborators: {
              columns: {
                id: true,
              },
              with: {
                user: {
                  with: {
                    userPrivacySetting: true,
                    userNotificationSetting: true,
                  },
                },
              },
            },
            postUserTags: {
              columns: {
                id: true,
              },
              with: {
                user: {
                  with: {
                    userPrivacySetting: true,
                    userNotificationSetting: true,
                  },
                },
              },
            },
          },
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
      let deletingPostCollaboratorsIds: string[] = [];
      let deletingPostUserTagsIds: string[] = [];

      if (!updatedPost)
        this.logger.warn(`Post with ID ${data.postId} not found.`);
      else {
        deletingPostCollaboratorsIds = updatedPost.postCollaborators
          .filter(
            (pc) =>
              pc.user.userPrivacySetting?.whoCanMention ===
              userPrivacySettingsWhoCanMentionEnum.enumValues[2],
          )
          .map((pc) => pc.id);
        deletingPostUserTagsIds = updatedPost.postUserTags
          .filter(
            (put) =>
              put.user.userPrivacySetting?.whoCanTag ===
              userPrivacySettingsWhoCanTagEnum.enumValues[2],
          )
          .map((put) => put.id);
      }

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
                .set({ postsCount: sql`${hashtags.postsCount} + 1` })
                .where(eq(hashtags.id, hashtag.id));
            }),
            ...deletingPostHashtags.map(async (postHashtag) => {
              await tx
                .update(hashtags)
                .set({
                  postsCount: sql`GREATEST(0, ${hashtags.postsCount} - 1)`,
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
            ...deletingPostCollaboratorsIds.map(async (postCollaboratorId) => {
              await tx
                .delete(postCollaborators)
                .where(eq(postCollaborators.id, postCollaboratorId));
            }),
            ...deletingPostUserTagsIds.map(async (postUserTagId) => {
              await tx
                .delete(postUserTags)
                .where(eq(postUserTags.id, postUserTagId));
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
      const [
        updatingUser,
        existingHashtags,
        existingLocation,
        existingAudio,
        existingCollections,
      ] = await Promise.all([
        this.db.query.users.findFirst({ where: eq(users.id, data.userId) }),
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
        data.collectionIds
          ? this.db.query.savedCollections.findMany({
              where: inArray(savedCollections.id, data.collectionIds),
            })
          : [],
      ]);

      if (!(existingHashtags.length > 0))
        this.logger.warn(
          `No existing hashtags found for the given IDs: ${data.hashtagIds.join(', ')}.`,
        );

      await this.db.transaction(async (tx) => {
        try {
          await Promise.all([
            updatingUser &&
              tx
                .update(users)
                .set({ postsCount: sql`GREATEST(0, ${users.postsCount} - 1)` })
                .where(eq(users.id, data.userId)),
            ...existingHashtags.map(async (hashtag) => {
              await tx
                .update(hashtags)
                .set({
                  postsCount: sql`GREATEST(0, ${hashtags.postsCount} - 1)`,
                })
                .where(eq(hashtags.id, hashtag.id));
            }),
            existingLocation &&
              tx
                .update(locations)
                .set({
                  postsCount: sql`GREATEST(0, ${locations.postsCount} - 1)`,
                })
                .where(eq(locations.id, existingLocation.id)),
            existingAudio &&
              (existingAudio.uploaderId === data.userId
                ? (async () => {
                    await tx
                      .delete(audioTracks)
                      .where(eq(audioTracks.id, existingAudio.id));
                  })()
                : tx
                    .update(audioTracks)
                    .set({
                      usageCount: sql`GREATEST(0, ${audioTracks.usageCount} - 1)`,
                    })
                    .where(eq(audioTracks.id, existingAudio.id))),
            ...data.postMediaData.map(async (media) => {
              await this.uploadService.deleteFile(
                media.originalRawFileUrl,
                media.mediaType,
              );
            }),
            ...existingCollections.map(async (collec) => {
              await tx
                .update(savedCollections)
                .set({
                  postsCount: sql`GREATEST(0, ${savedCollections.postsCount} - 1)`,
                })
                .where(eq(savedCollections.id, collec.id));
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

  async handlePostSaved(data: PostSavedEvent) {
    try {
      const savedPost = await this.db.query.posts.findFirst({
        where: eq(posts.id, data.postId),
      });

      if (!savedPost)
        return this.logger.warn(`Post with ID ${data.postId} not found.`);

      await this.db
        .update(posts)
        .set({ savesCount: sql`${posts.savesCount} + 1` })
        .where(eq(posts.id, data.postId));
    } catch (error) {
      this.logger.error('Error handling post saved event.', error);
      throw error;
    }
  }

  async handlePostUnsaved(data: PostUnsavedEvent) {
    try {
      const unsavedPost = await this.db.query.posts.findFirst({
        where: eq(posts.id, data.postId),
      });

      if (!unsavedPost)
        return this.logger.warn(`Post with ID ${data.postId} not found.`);

      await this.db
        .update(posts)
        .set({ savesCount: sql`GREATEST(0, ${posts.savesCount} - 1)` })
        .where(eq(posts.id, data.postId));
    } catch (error) {
      this.logger.error('Error handling post unsaved event.', error);
      throw error;
    }
  }
  async handlePostViewed(data: PostViewedEvent) {
    const post = await this.db.query.posts.findFirst({
      where: eq(posts.id, data.postId),
      columns: {
        userId: true,
      },
    });

    if (!post) {
      this.logger.warn(`Post with ID ${data.postId} not found.`);
      return;
    }

    if (post.userId === data.userId) {
      return;
    }

    await this.db
      .update(posts)
      .set({
        viewsCount: sql`${posts.viewsCount} + 1`,
      })
      .where(eq(posts.id, data.postId));
  }
}
