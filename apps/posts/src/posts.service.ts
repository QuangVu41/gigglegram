import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { createTSQuery, UploadService } from '@repo/common';
import {
  audioTracks,
  DATABASE_CONNECTION,
  hashtags,
  postCollaborators,
  postCollaboratorsStatusEnum,
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
  FindManyQueryDto,
  KAFKA_SERVICE_NAME,
  PostCollaboratorAcceptedEvent,
  PostCreatedEvent,
  PostDeletedEvent,
  POSTS_TOPIC_POST_COLLABORATOR_ACCEPTED,
  POSTS_TOPIC_POST_CREATED,
  POSTS_TOPIC_POST_DELETED,
  POSTS_TOPIC_POST_SAVED,
  POSTS_TOPIC_POST_UNSAVED,
  POSTS_TOPIC_POST_UPDATED,
  PostSavedEvent,
  PostUnsavedEvent,
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
import { PostsRepository } from '@repo/database';
import { formatDateWithLocale } from '@repo/common';
import { FindManyPostsDto } from '@/src/dto/find-many-posts.dto';
import { inArray } from 'drizzle-orm';
import { SavePostDto } from '@/src/dto/save-post.dto';
import { FindManySavedPostsDto } from './dto/find-many-saved-posts.dto';
import { or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { FindManyPostsByHashtagDto } from '@/src/dto/find-many-posts-by-hashtag.dto';
import { UpdatePostCollaborationDto } from '@/src/dto/update-post-collaboration.dto';

@Injectable()
export class PostsService implements OnModuleInit {
  private readonly logger = new Logger(PostsService.name);
  private systemSettingsService!: SystemSettingsServiceClient;

  constructor(
    private readonly uploadService: UploadService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafkaProxy,
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

  async findManyPostsByHashtag(
    findManyPostsByHashtagDto: FindManyPostsByHashtagDto,
  ) {
    return (
      await this.db.query.hashtags.findMany({
        where: findManyPostsByHashtagDto.hashtag
          ? sql`${createTSQuery<typeof hashtags>(['name'], findManyPostsByHashtagDto.hashtag)}`
          : undefined,
        with: {
          postHashtags: {
            with: {
              post: {
                with: {
                  postMedia: true,
                },
              },
            },
            limit: findManyPostsByHashtagDto.limit,
          },
        },
        limit: findManyPostsByHashtagDto.limit,
        offset:
          (findManyPostsByHashtagDto.page - 1) *
          findManyPostsByHashtagDto.limit,
      })
    )
      .flatMap((hashtag) => hashtag.postHashtags.map((ph) => ph.post))
      .filter((post) => !post.isArchived);
  }

  async findManyHashtags(findManyHashtagsDto: FindManyQueryDto) {
    return await this.db.query.hashtags.findMany({
      where: findManyHashtagsDto.keyword
        ? sql`${createTSQuery<typeof hashtags>(['name'], findManyHashtagsDto.keyword)}`
        : undefined,
      limit: findManyHashtagsDto.limit,
      offset: (findManyHashtagsDto.page - 1) * findManyHashtagsDto.limit,
    });
  }

  async findManyUserArchivedPosts(
    findManyPostsDto: FindManyPostsDto,
    user: typeof users.$inferSelect,
  ) {
    return await this.postsRepository.findMany(
      {
        where: and(
          and(
            findManyPostsDto.keyword
              ? sql`${createTSQuery<typeof posts>(['caption'], findManyPostsDto.keyword)}`
              : undefined,
            eq(posts.userId, user.id),
          ),
          eq(posts.isArchived, true),
        ),
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
      findManyPostsDto,
    );
  }

  async findManyPosts(findManyPostsDto: FindManyPostsDto, ownerId?: string) {
    return await this.postsRepository.findMany(
      {
        where: and(
          or(
            inArray(posts.id, findManyPostsDto.ids),
            findManyPostsDto.keyword
              ? sql`${createTSQuery<typeof posts>(['caption'], findManyPostsDto.keyword)}`
              : undefined,
            ownerId ? eq(posts.userId, ownerId) : undefined,
          ),
          eq(posts.isArchived, false),
        ),
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
      findManyPostsDto,
    );
  }

  async findManyUserPosts(
    findManyPostsDto: FindManyPostsDto,
    user: typeof users.$inferSelect,
  ) {
    return await this.findManyPosts(findManyPostsDto, user.id);
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

      const createdPost = await this.db.transaction(async (tx) => {
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
            .returning();

          const postMediaInserts = await Promise.allSettled<
            Promise<typeof postMedia.$inferInsert>
          >(
            media.map(async (file, idx) => {
              const isImage = file.mimetype.startsWith('image/');
              const isVideo = file.mimetype.startsWith('video/');
              const width = isImage
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
              const height = isImage
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

          this.kafkaClient.emit(
            POSTS_TOPIC_POST_CREATED,
            new PostCreatedEvent(newPost!.id),
          );

          return newPost;
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

      return createdPost;
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

      const updatedPost = await this.db.transaction(async (tx) => {
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
          let newPostUserTagsIds: string[] = [];
          if (
            updatePostDto.taggedUsers &&
            updatePostDto.taggedUsers.length > 0
          ) {
            deletingPostUserTagsIds = existingPost.postUserTags
              .filter(
                (eput) =>
                  !updatePostDto.taggedUsers!.find(
                    (tu) => tu.id && tu.id === eput.id,
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

            newPostUserTagsIds = newPostUserTags
              .filter((tu) => tu.id)
              .map((tu) => tu.id!) as string[];

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

          if (
            updatePostDto.caption ||
            updatePostDto.locationId !== undefined ||
            updatePostDto.likesHidden ||
            updatePostDto.commentsDisabled
          ) {
            const [updatedPost] = await tx
              .update(posts)
              .set({
                caption: updatePostDto.caption,
                locationId: updatePostDto.locationId,
                likesHidden: updatePostDto.likesHidden,
                commentsDisabled: updatePostDto.commentsDisabled,
                sharesCount: updatePostDto.sharesCount,
                viewsCount: updatePostDto.viewsCount,
                playsCount: updatePostDto.playsCount,
              })
              .where(eq(posts.id, existingPost.id))
              .returning();

            this.kafkaClient.emit(
              POSTS_TOPIC_POST_UPDATED,
              new PostUpdatedEvent(
                existingPost.id,
                newHashtagIds,
                deletingHashtagIds,
                newCollaboratorIds,
                deletingCollaboratorIds,
                newPostUserTagsIds,
                deletingPostUserTagsIds,
              ),
            );

            return updatedPost;
          }
        } catch (error) {
          this.logger.error('Error during post updating transaction.', error);
          throw error;
        }
      });

      return updatedPost;
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
          user: { columns: { id: true } },
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
          savedPosts: { columns: { collectionId: true } },
        },
      });
      if (!existingPost)
        throw new NotFoundException({
          code: SystemWideErrorCodes.NOT_FOUND,
        });

      const collectionIds = existingPost.savedPosts
        .filter((sp) => sp.collectionId !== null)
        .map((sp) => sp.collectionId) as string[];

      const deletedPost = await this.postsRepository.delete(existingPost.id);

      const hashtagIds = existingPost.postHashtags.map(
        ({ hashtag }) => hashtag.id,
      );
      const postMediaData = existingPost.postMedia;

      this.kafkaClient.emit(
        POSTS_TOPIC_POST_DELETED,
        new PostDeletedEvent(
          existingPost.user.id,
          existingPost.id,
          hashtagIds,
          postMediaData,
          existingPost.location?.id,
          existingPost.audioTrack?.id,
          collectionIds,
        ),
      );

      return deletedPost;
    } catch (error) {
      this.logger.error('Error deleting post.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async findManyTaggedPosts(
    findManyPostsDto: FindManyPostsDto,
    user: typeof users.$inferSelect,
  ) {
    return await this.postsRepository.findMany(
      {
        with: {
          postUserTags: {
            where: eq(schema.postUserTags.userId, user.id),
          },
          postCollaborators: {
            where: eq(schema.postCollaborators.userId, user.id),
          },
        },
      },
      findManyPostsDto,
    );
  }

  async findManyUserSavedPosts(
    findManySavedPostsDto: FindManySavedPostsDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const savedPosts = await this.postsRepository.findMany(
        {
          with: {
            savedPosts: {
              where: eq(schema.savedPosts.userId, user.id),
            },
            postMedia: true,
          },
        },
        findManySavedPostsDto,
      );

      return savedPosts;
    } catch (error) {
      this.logger.error('Error fetching saved posts.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.FETCHING_FAILED,
      });
    }
  }

  async savePost(savePostDto: SavePostDto, user: typeof users.$inferSelect) {
    try {
      const existingPost = await this.postsRepository.findFirst({
        where: eq(posts.id, savePostDto.postId),
      });
      if (!existingPost)
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

      const [createdSavedPost] = await this.db
        .insert(schema.savedPosts)
        .values({ postId: savePostDto.postId, userId: user.id })
        .returning()
        .onConflictDoNothing();

      if (createdSavedPost)
        this.kafkaClient.emit(
          POSTS_TOPIC_POST_SAVED,
          new PostSavedEvent(savePostDto.postId),
        );

      return createdSavedPost;
    } catch (error) {
      this.logger.error('Error saving post.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async unsavePost(postId: string, user: typeof users.$inferSelect) {
    try {
      const existingSavedPost = await this.db.query.savedPosts.findFirst({
        where: and(
          eq(schema.savedPosts.postId, postId),
          eq(schema.savedPosts.userId, user.id),
        ),
      });
      if (!existingSavedPost)
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

      const [deletedSavedPost] = await this.db
        .delete(schema.savedPosts)
        .where(eq(schema.savedPosts.id, existingSavedPost.id))
        .returning();

      this.kafkaClient.emit(
        POSTS_TOPIC_POST_UNSAVED,
        new PostUnsavedEvent(postId),
      );

      return deletedSavedPost;
    } catch (error) {
      this.logger.error('Error unsaving post.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async updatePostCollaboration(
    updatePostCollaborationDto: UpdatePostCollaborationDto,
    user: typeof users.$inferSelect,
  ) {
    const existingPost = await this.postsRepository.findFirst({
      where: eq(posts.id, updatePostCollaborationDto.postId),
    });

    if (!existingPost)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post not found.',
      });

    if (
      updatePostCollaborationDto.status ===
      postCollaboratorsStatusEnum.enumValues[0]
    )
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
        description: 'Cannot update collaboration with "pending" status.',
      });

    const [result] = await this.db
      .update(schema.postCollaborators)
      .set({
        status: updatePostCollaborationDto.status,
      })
      .where(
        and(
          eq(
            schema.postCollaborators.postId,
            updatePostCollaborationDto.postId,
          ),
          eq(schema.postCollaborators.userId, user.id),
        ),
      )
      .returning();

    if (result)
      this.kafkaClient.emit(
        POSTS_TOPIC_POST_COLLABORATOR_ACCEPTED,
        new PostCollaboratorAcceptedEvent(result?.id),
      );

    return result;
  }
}
