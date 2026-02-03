import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { UploadService } from '@repo/common';
import {
  audioTracks,
  DATABASE_CONNECTION,
  hashtags,
  postCollaborators,
  postHashtags,
  postMedia,
  posts,
  postStatus,
  postUserTags,
  schema,
  users,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  ENGAGEMENTS_SERVICE_NAME,
  PostCreatedEvent,
  PostDeletedEvent,
  POSTS_TOPIC_POST_CREATED,
  POSTS_TOPIC_POST_DELETED,
  POSTS_TOPIC_POST_UPDATED,
  PostUpdatedEvent,
  SYSTEM_SETTINGS_SERVICE_NAME,
  SystemSettingsServiceClient,
  SystemWideErrorCodes,
  SystemWideErrorMessages,
} from '@repo/types';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { UpdatePostDto } from '@/src/dto/update-post.dto';
import { type ClientGrpc, type ClientKafkaProxy } from '@nestjs/microservices';
import { and } from 'drizzle-orm';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { PostsRepository } from '@/src/posts.repository';
import { formatDateWithLocale } from '@repo/common';
import { FilterPostsDto } from '@/src/dto/filter-posts.dto';
import { inArray } from 'drizzle-orm';

@Injectable()
export class PostsService implements OnModuleInit {
  private readonly logger = new Logger(PostsService.name);
  private systemSettingsService!: SystemSettingsServiceClient;

  constructor(
    private readonly uploadService: UploadService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    @Inject(ENGAGEMENTS_SERVICE_NAME)
    private readonly engagementsClient: ClientKafkaProxy,
    @Inject(SYSTEM_SETTINGS_SERVICE_NAME)
    private readonly systemSettingsClient: ClientGrpc,
    private readonly postsRepository: PostsRepository,
  ) {}

  onModuleInit() {
    this.systemSettingsService =
      this.systemSettingsClient.getService<SystemSettingsServiceClient>(
        SYSTEM_SETTINGS_SERVICE_NAME,
      );
  }

  async findPostById(postId: string) {
    return await this.postsRepository.findFirst({
      where: eq(posts.id, postId),
      with: {
        postMedia: true,
        postCollaborators: true,
        postHashtags: {
          with: {
            hashtag: true,
          },
        },
        audioTrack: true,
        location: true,
        postUserTags: true,
      },
    });
  }

  async findManyPosts(filterPostsDto: FilterPostsDto) {
    return await this.postsRepository.findMany(
      {
        where: inArray(posts.id, filterPostsDto.ids),
        with: {
          postMedia: true,
          postCollaborators: true,
          postHashtags: {
            with: {
              hashtag: true,
            },
          },
          audioTrack: true,
          location: true,
          postUserTags: true,
        },
      },
      filterPostsDto,
    );
  }

  async createPost(
    media: Array<Express.Multer.File>,
    createPostDto: CreatePostDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const { settings } = await firstValueFrom(
        this.systemSettingsService.findSettingsByPrefix(
          {
            prefixes: ['image', 'video'],
          },
          {} as Metadata,
        ),
      );

      const isReel =
        media.length === 1 && media[0]?.mimetype.startsWith('video/')
          ? true
          : false;
      const postMediaInsertUrls: Pick<
        typeof postMedia.$inferInsert,
        'mediaType' | 'originalRawFileUrl' | 'thumbnailUrl'
      >[] = [];
      const haveVideo = media.some((file) =>
        file.mimetype.startsWith('video/'),
      );
      const postVideoDurationArr: number[] = [];
      let createdPostMedia: Pick<
        typeof postMedia.$inferInsert,
        'id' | 'displayOrder'
      >[] = [];

      await this.db.transaction(async (tx) => {
        try {
          const [newPost] = await tx
            .insert(posts)
            .values({
              caption: createPostDto.caption,
              userId: user.id,
              commentsDisabled: createPostDto.commentsDisabled,
              likesHidden: createPostDto.likesHidden,
              status: haveVideo
                ? postStatus.enumValues[0]
                : postStatus.enumValues[1],
              locationId: createPostDto.locationId,
              isReel,
            })
            .returning({ id: posts.id });

          const postMediaInserts = await Promise.allSettled<
            Promise<typeof postMedia.$inferInsert>
          >(
            media.map(async (file, idx) => {
              const isImage = file.mimetype.startsWith('image/');
              const isVideo = file.mimetype.startsWith('video/');
              let width = isImage
                ? settings['image.post_width']?.intValue ||
                  parseInt(
                    this.configService.getOrThrow<string>(
                      'DEFAULT_POST_IMAGE_WIDTH',
                    )!,
                  )
                : settings['video.post_width']?.intValue ||
                  parseInt(
                    this.configService.getOrThrow<string>(
                      'DEFAULT_POST_VIDEO_WIDTH',
                    )!,
                  );
              let height = isImage
                ? settings['image.post_height']?.intValue ||
                  parseInt(
                    this.configService.getOrThrow<string>(
                      'DEFAULT_POST_IMAGE_HEIGHT',
                    )!,
                  )
                : settings['video.post_height']?.intValue ||
                  parseInt(
                    this.configService.getOrThrow<string>(
                      'DEFAULT_POST_VIDEO_HEIGHT',
                    )!,
                  );
              let duration: number | undefined;
              let thumbnailUrl: string;
              let resultUrlObj: {
                mediaUrl: string;
                originalRawFileUrl: string;
              };

              if (isVideo) {
                const metadata = await this.uploadService.getVideoMetadata(
                  file.buffer,
                );
                duration =
                  metadata.format.duration && metadata.format.duration < 1
                    ? 1
                    : Math.floor(metadata.format.duration!);

                if (
                  duration <
                  (settings['video.least_duration']?.intValue ||
                    parseInt(
                      this.configService.getOrThrow<string>(
                        'DEFAULT_LEAST_VIDEO_DURATION',
                      )!,
                    ))
                )
                  throw new BadRequestException({
                    code: SystemWideErrorCodes.UPLOAD_VIDEO_DURATION_TOO_SHORT,
                  });
                if (
                  isReel &&
                  duration >
                    (settings['video.reel_max_duration']?.intValue ||
                      parseInt(
                        this.configService.getOrThrow<string>(
                          'DEFAULT_REEL_MAX_VIDEO_DURATION',
                        )!,
                      ))
                )
                  throw new BadRequestException({
                    code: SystemWideErrorCodes.UPLOAD_REEL_VIDEO_DURATION_EXCEEDED,
                  });
                else if (
                  !isReel &&
                  duration >
                    (settings['video.post_max_duration']?.intValue ||
                      parseInt(
                        this.configService.getOrThrow<string>(
                          'DEFAULT_POST_MAX_VIDEO_DURATION',
                        )!,
                      ))
                )
                  throw new BadRequestException({
                    code: SystemWideErrorCodes.UPLOAD_POST_VIDEO_DURATION_EXCEEDED,
                  });
                postVideoDurationArr.push(duration);

                const inputVideoWidth = metadata.streams[0]?.width;
                const inputVideoHeight = metadata.streams[0]?.height;

                if (!inputVideoWidth || !inputVideoHeight)
                  throw new BadRequestException({
                    code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
                  });

                width = inputVideoWidth;
                height = inputVideoHeight;

                file.buffer = await this.uploadService.preprocessVideoFile(
                  file.buffer,
                );

                resultUrlObj = await this.uploadService.uploadFile(
                  file,
                  'video',
                  {
                    isReel: isReel.toString(),
                    audioOmitted:
                      createPostDto.audioOmitted?.toString() || 'false',
                    millisecondsToExtractThumbnail:
                      createPostDto.millisecondsToExtractThumbnail?.toString() ||
                      '1000',
                    inputVideoWidth: inputVideoWidth!.toString(),
                    inputVideoHeight: inputVideoHeight!.toString(),
                    postId: newPost!.id,
                  },
                );

                thumbnailUrl =
                  resultUrlObj.mediaUrl.split('/').slice(0, -1).join('/') +
                  '/' +
                  this.configService.getOrThrow<string>(
                    'GOOGLE_OUTPUT_THUMBNAIL_FILE_NAME',
                  )!;
              } else {
                file.buffer = await this.uploadService.preprocessImageFile(
                  file.buffer,
                  width,
                  height,
                );
                file.originalname =
                  file.originalname.split('.').slice(0, -1).join('.') + '.webp';
                file.mimetype = 'image/webp';

                resultUrlObj = await this.uploadService.uploadFile(
                  file,
                  'images',
                );
                thumbnailUrl = resultUrlObj.mediaUrl;
              }

              postMediaInsertUrls[idx] = {
                mediaType: file.mimetype,
                originalRawFileUrl: resultUrlObj.originalRawFileUrl,
                thumbnailUrl,
              };

              const altTestNum = media.length > 1 ? ` number ${idx + 1} ` : ' ';
              const altText = isImage
                ? `Photo${altTestNum}by ${user.name} on ${formatDateWithLocale(new Date())}. ${createPostDto.caption ? `The caption says "${createPostDto.caption}".` : 'And there is no caption.'}`
                : createPostDto.caption ||
                  `A thumbnail image${altTestNum}of a video by ${user.name} on ${formatDateWithLocale(new Date())}.`;

              return {
                postId: newPost!.id,
                mediaUrl: resultUrlObj.mediaUrl,
                originalRawFileUrl: resultUrlObj.originalRawFileUrl,
                mediaType: file.mimetype,
                thumbnailUrl: thumbnailUrl,
                duration,
                displayOrder: idx,
                width,
                height,
                altText,
              };
            }),
          );

          if (postMediaInserts.some((pmi) => pmi.status === 'rejected')) {
            const rejectedError = postMediaInserts.find(
              (pmi) => pmi.status === 'rejected',
            ) as PromiseRejectedResult;
            this.logger.error(
              'Error uploading post media files.',
              rejectedError.reason,
            );
            throw rejectedError.reason;
          }

          const postMediaInsertsResolved = postMediaInserts
            .filter(
              (
                pmi,
              ): pmi is PromiseFulfilledResult<typeof postMedia.$inferInsert> =>
                pmi.status === 'fulfilled',
            )
            .map((pmi) => pmi.value);

          if (
            postVideoDurationArr.length > 1 &&
            postVideoDurationArr.some(
              (vidDuration) =>
                vidDuration >
                (settings['video.post_max_multi_duration']?.intValue ||
                  this.configService.getOrThrow<number>(
                    'DEFAULT_POST_MAX_MULTI_VIDEOS_DURATION',
                  )!),
            )
          )
            throw new BadRequestException({
              code: SystemWideErrorCodes.UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION,
              description:
                SystemWideErrorMessages.UPLOAD_POST_MAX_MULTI_VIDEOS_DURATION,
            });

          if (postMediaInserts.length > 0) {
            createdPostMedia = await tx
              .insert(postMedia)
              .values(postMediaInsertsResolved)
              .returning({
                id: postMedia.id,
                displayOrder: postMedia.displayOrder,
              });
          }

          if (createPostDto.hashtagIds && createPostDto.hashtagIds.length > 0) {
            const uniqueHashtagIds = [...new Set(createPostDto.hashtagIds)];
            const postHashtagsInserts = uniqueHashtagIds.map<
              typeof postHashtags.$inferInsert
            >((hashtagId) => ({
              postId: newPost!.id,
              hashtagId,
            }));
            await tx
              .insert(postHashtags)
              .values(postHashtagsInserts)
              .onConflictDoNothing();
          }
          if (
            createPostDto.newHashtags &&
            createPostDto.newHashtags.length > 0
          ) {
            const uniqueNewHashtags = [...new Set(createPostDto.newHashtags)];
            const newHashtagInserts = uniqueNewHashtags.map<
              typeof hashtags.$inferInsert
            >((name) => ({
              name,
            }));
            const createdHashtags = await tx
              .insert(hashtags)
              .values(newHashtagInserts)
              .onConflictDoNothing()
              .returning({ id: hashtags.id });

            if (createdHashtags.length > 0) {
              const postHashtagsInsertsFromNewHashtags = createdHashtags.map<
                typeof postHashtags.$inferInsert
              >((hashtag) => ({
                postId: newPost!.id,
                hashtagId: hashtag.id,
              }));
              await tx
                .insert(postHashtags)
                .values(postHashtagsInsertsFromNewHashtags)
                .onConflictDoNothing();
            }
          }

          if (createPostDto.audioOmitted && createPostDto.audioId && isReel) {
            await tx
              .update(posts)
              .set({ audioId: createPostDto.audioId })
              .where(eq(posts.id, newPost!.id));
          }
          if (!createPostDto.audioOmitted && isReel) {
            const audioUrl =
              postMediaInsertsResolved[0]!.mediaUrl
                .split('/')
                .slice(0, -1)
                .join('/') +
              `/${this.configService.getOrThrow<string>('GOOGLE_OUTPUT_AUDIO_FILE_NAME')}`;
            const duration = postMediaInsertsResolved[0]!.duration!;
            const newAudioTrack = await tx
              .insert(audioTracks)
              .values({ uploaderId: user.id, audioUrl, duration })
              .returning({ id: audioTracks.id });
            await tx
              .update(posts)
              .set({ audioId: newAudioTrack[0]!.id })
              .where(eq(posts.id, newPost!.id));
          }

          if (
            createPostDto.collaboratorIds &&
            createPostDto.collaboratorIds.length > 0
          ) {
            const postCollaboratorsAuthorInserts: typeof postCollaborators.$inferInsert =
              {
                postId: newPost!.id,
                userId: user.id,
                isOriginalAuthor: true,
              };
            const postCollaboratorsInserts = createPostDto.collaboratorIds.map<
              typeof postCollaborators.$inferInsert
            >((collaboratorId) => ({
              postId: newPost!.id,
              userId: collaboratorId,
            }));
            postCollaboratorsInserts.unshift(postCollaboratorsAuthorInserts);

            await tx.insert(postCollaborators).values(postCollaboratorsInserts);
          }

          if (
            createPostDto.taggedUsers &&
            createPostDto.taggedUsers.length > 0
          ) {
            const taggedUsersInserts = createPostDto.taggedUsers.map<
              typeof postUserTags.$inferInsert
            >((postUserTag) => ({
              postId: newPost!.id,
              userId: postUserTag.userId,
              xPosition: postUserTag.xPosition.toString(),
              yPosition: postUserTag.yPosition.toString(),
              mediaId: createdPostMedia.find(
                (media) => media.displayOrder === postUserTag.mediaDisplayOrder,
              )!.id!,
            }));

            await tx
              .insert(postUserTags)
              .values(taggedUsersInserts)
              .onConflictDoNothing();
          }

          this.engagementsClient.emit(
            POSTS_TOPIC_POST_CREATED,
            new PostCreatedEvent(newPost!.id),
          );
        } catch (error) {
          this.logger.error('Error during post creating transaction.', error);
          if (postMediaInsertUrls.length > 0)
            await Promise.all(
              postMediaInsertUrls.map(async (media) => {
                await this.uploadService.deleteFile(
                  media.originalRawFileUrl!,
                  media.mediaType,
                );
              }),
            );
          throw error;
        }
      });
    } catch (error) {
      this.logger.error('Error creating new post.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async updatePost(
    postId: string,
    updatePostDto: UpdatePostDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingPost = await this.db.query.posts.findFirst({
        where: and(eq(posts.id, postId), eq(posts.userId, user.id)),
        with: {
          postHashtags: {
            columns: {
              hashtagId: true,
            },
          },
          postCollaborators: {
            columns: { userId: true, isOriginalAuthor: true },
          },
          postMedia: {
            columns: {
              id: true,
              displayOrder: true,
            },
          },
          postUserTags: {
            columns: {
              id: true,
              userId: true,
              postId: true,
              xPosition: true,
              yPosition: true,
              mediaId: true,
            },
          },
        },
      });

      if (!existingPost)
        throw new BadRequestException({
          code: SystemWideErrorCodes.NOT_FOUND,
        });

      await this.db.transaction(async (tx) => {
        try {
          const hashtagIdsSet: string[] = [];

          if (updatePostDto.hashtagIds && updatePostDto.hashtagIds.length > 0) {
            const uniqueHashtagIds = [...new Set(updatePostDto.hashtagIds)];
            const postHashtagsInserts = uniqueHashtagIds.map<
              typeof postHashtags.$inferInsert
            >((hashtagId) => ({
              postId: existingPost.id,
              hashtagId,
            }));
            await tx
              .insert(postHashtags)
              .values(postHashtagsInserts)
              .onConflictDoNothing();

            hashtagIdsSet.push(...uniqueHashtagIds);
          }
          if (
            updatePostDto.newHashtags &&
            updatePostDto.newHashtags.length > 0
          ) {
            const uniqueNewHashtags = [...new Set(updatePostDto.newHashtags)];
            const newHashtagInserts = uniqueNewHashtags.map<
              typeof hashtags.$inferInsert
            >((name) => ({
              name,
            }));
            const createdHashtags = await tx
              .insert(hashtags)
              .values(newHashtagInserts)
              .onConflictDoNothing()
              .returning({ id: hashtags.id });

            if (createdHashtags.length > 0) {
              const postHashtagsInsertsFromNewHashtags = createdHashtags.map<
                typeof postHashtags.$inferInsert
              >((hashtag) => ({
                postId: existingPost.id,
                hashtagId: hashtag.id,
              }));
              await tx
                .insert(postHashtags)
                .values(postHashtagsInsertsFromNewHashtags)
                .onConflictDoNothing();
            }

            hashtagIdsSet.push(...createdHashtags.map((hashtag) => hashtag.id));
          }

          const existingCollaboratorIds = existingPost.postCollaborators.map(
            (pc) => pc.userId,
          );
          let newCollaboratorIds: string[] = [];
          let deletingCollaboratorIds: string[] = [];
          if (
            updatePostDto.collaboratorIds &&
            updatePostDto.collaboratorIds.length > 0
          ) {
            deletingCollaboratorIds = existingCollaboratorIds.filter(
              (id) => !updatePostDto.collaboratorIds?.includes(id),
            );
            newCollaboratorIds = updatePostDto.collaboratorIds.filter(
              (id) => !existingCollaboratorIds.includes(id),
            );
            const postCollaboratorsInserts = newCollaboratorIds.map<
              typeof postCollaborators.$inferInsert
            >((collaboratorId) => ({
              postId: existingPost.id,
              userId: collaboratorId,
            }));
            if (
              !existingPost.postCollaborators.some((pc) => pc.isOriginalAuthor)
            ) {
              const postCollaboratorsAuthorInserts: typeof postCollaborators.$inferInsert =
                {
                  postId: existingPost.id,
                  userId: user.id,
                  isOriginalAuthor: true,
                };
              postCollaboratorsInserts.unshift(postCollaboratorsAuthorInserts);
            }

            await tx.insert(postCollaborators).values(postCollaboratorsInserts);
          }

          let deletingPostUserTagsIds: string[] = [];
          if (
            updatePostDto.taggedUsers &&
            updatePostDto.taggedUsers.length > 0
          ) {
            deletingPostUserTagsIds = existingPost.postUserTags
              .filter(
                (eput) =>
                  !updatePostDto.taggedUsers!.find(
                    (tu) => tu.id !== undefined && tu.id === eput.id,
                  ),
              )
              .map((ptu) => ptu.id!);
            const existingPostUserTags = existingPost.postUserTags;
            const updatingPostUserTags = updatePostDto.taggedUsers.filter(
              (tu) =>
                tu.id && existingPostUserTags.find((eput) => eput.id === tu.id),
            );
            const newPostUserTags = updatePostDto.taggedUsers.filter(
              (tu) =>
                !tu.id ||
                !existingPostUserTags.find((eput) => eput.id === tu.id),
            );
            const taggedUsersInserts = newPostUserTags.map<
              typeof postUserTags.$inferInsert
            >((postUserTag) => ({
              postId: existingPost.id,
              userId: postUserTag.userId,
              xPosition: postUserTag.xPosition.toString(),
              yPosition: postUserTag.yPosition.toString(),
              mediaId: existingPost.postMedia.find(
                (media) => media.displayOrder === postUserTag.mediaDisplayOrder,
              )!.id!,
            }));

            await Promise.all([
              tx
                .insert(postUserTags)
                .values(taggedUsersInserts)
                .onConflictDoNothing(),
              ...updatingPostUserTags.map(async (put) => {
                await tx
                  .update(postUserTags)
                  .set({
                    mediaId: existingPost.postMedia.find(
                      (media) => media.displayOrder === put.mediaDisplayOrder,
                    )!.id!,
                    xPosition: put.xPosition.toString(),
                    yPosition: put.yPosition.toString(),
                  })
                  .where(eq(postUserTags.id, put.id!));
              }),
            ]);
          }

          const existingHashtagsIds = existingPost.postHashtags.map(
            (ph) => ph.hashtagId,
          );
          const newHashtagIds = hashtagIdsSet.filter(
            (id) => !existingHashtagsIds.includes(id),
          );
          const deletingHashtagIds = existingHashtagsIds.filter(
            (id) => !hashtagIdsSet.includes(id),
          );

          await tx
            .update(posts)
            .set({
              caption: updatePostDto.caption,
              locationId: updatePostDto.locationId,
              likesHidden: updatePostDto.likesHidden,
              commentsDisabled: updatePostDto.commentsDisabled,
            })
            .where(eq(posts.id, existingPost.id));

          this.engagementsClient.emit(
            POSTS_TOPIC_POST_UPDATED,
            new PostUpdatedEvent(
              existingPost.id,
              newHashtagIds,
              deletingHashtagIds,
              newCollaboratorIds,
              deletingCollaboratorIds,
              deletingPostUserTagsIds,
            ),
          );
        } catch (error) {
          this.logger.error('Error during post updating transaction.', error);
          throw error;
        }
      });
    } catch (error) {
      this.logger.error('Error updating post.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
  }

  async deletePost(postId: string) {
    try {
      const existingPost = await this.postsRepository.findFirst({
        where: eq(posts.id, postId),
        with: {
          postMedia: { columns: { mediaType: true, originalRawFileUrl: true } },
          postHashtags: {
            columns: {},
            with: {
              hashtag: {
                columns: { id: true },
              },
            },
          },
          location: { columns: { id: true } },
          audioTrack: { columns: { id: true } },
        },
      });
      if (!existingPost)
        throw new BadRequestException({
          code: SystemWideErrorCodes.NOT_FOUND,
        });

      await this.postsRepository.delete(existingPost.id);

      const hashtagIds = existingPost.postHashtags.map(
        ({ hashtag }) => hashtag.id,
      );
      const postMediaData = existingPost.postMedia;

      this.engagementsClient.emit(
        POSTS_TOPIC_POST_DELETED,
        new PostDeletedEvent(
          existingPost.id,
          hashtagIds,
          postMediaData,
          existingPost.location?.id,
          existingPost.audioTrack?.id,
        ),
      );
    } catch (error) {
      this.logger.error('Error deleting post.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }
}
