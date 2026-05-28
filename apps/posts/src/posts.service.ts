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
import { FindManyPostMediaDto } from '@/src/dto/find-many-post-media.dto';
import { UpdatePostMediaModerationDto } from '@/src/dto/update-post-media-moderation.dto';
import { UpdateManyPostMediaModerationDto } from '@/src/dto/update-many-post-media-moderation.dto';
import { CreateHashtagDto } from '@/src/dto/create-hashtag.dto';
import { UpdateHashtagDto } from '@/src/dto/update-hashtag.dto';
import { createTSQuery, ModerationService, UploadService } from '@repo/common';
import {
  audioTracks,
  DATABASE_CONNECTION,
  hashtags,
  postCollaborators,
  postCollaboratorsStatusEnum,
  postHashtags,
  postMedia,
  postMediaStatus,
  posts,
  postUserTags,
  postUserTagsStatusEnum,
  schema,
  users,
  likes,
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
import { eq, ilike, type SQL } from 'drizzle-orm';
import { UpdatePostDto } from '@/src/dto/update-post.dto';
import { type ClientGrpc, type ClientKafkaProxy } from '@nestjs/microservices';
import { and, or, exists } from 'drizzle-orm';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { PostsRepository, PostMediaRepository } from '@repo/database';
import { formatDateWithLocale } from '@repo/common';
import { FindManyPostsDto } from '@/src/dto/find-many-posts.dto';
import { FindManyHashtagsDto } from '@/src/dto/find-many-hashtags.dto';
import { FindManyAudioDto } from '@/src/dto/find-many-audio.dto';
import { inArray } from 'drizzle-orm';
import { SavePostDto } from '@/src/dto/save-post.dto';
import { SaveAudioTrackDto } from '@/src/dto/save-audio-track.dto';
import { FindManySavedPostsDto } from '@/src/dto/find-many-saved-posts.dto';
import { sql } from 'drizzle-orm';
import { FindManyPostsByHashtagDto } from '@/src/dto/find-many-posts-by-hashtag.dto';
import { UpdatePostCollaborationDto } from '@/src/dto/update-post-collaboration.dto';
import { UpdatePostUserTagStatusDto } from '@/src/dto/update-post-user-tag-status.dto';
import { UpdateAudioDto } from '@/src/dto/update-audio.dto';
import { desc } from 'drizzle-orm';
import { asc } from 'drizzle-orm';
import { gte, lte, ne, count, sum } from 'drizzle-orm';

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
    private readonly postMediaRepository: PostMediaRepository,
    private readonly moderationService: ModerationService,
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
        user: { with: { userPrivacySetting: true } },
        postMedia: true,
        postCollaborators: { with: { user: true } },
        postHashtags: {
          with: {
            hashtag: true,
          },
        },
        audioTrack: true,
        location: true,
        postUserTags: { with: { user: true } },
        likes: { with: { user: true } },
        savedPosts: true,
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
                  postMedia: {
                    where: ne(postMedia.moderationStatus, 'flagged'),
                  },
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

  async findManyHashtags(findManyHashtagsDto: FindManyHashtagsDto) {
    let orderBy: any;
    const { sort } = findManyHashtagsDto;
    const [sortField, sortOrder] = sort.split(',');
    if (sortField && sortOrder && sortField in hashtags)
      orderBy =
        sortOrder === 'desc'
          ? [desc(hashtags[sortField])]
          : [asc(hashtags[sortField])];

    const whereConditions: any[] = [];
    if (findManyHashtagsDto.keyword) {
      whereConditions.push(
        sql`${createTSQuery<typeof hashtags>(['name'], findManyHashtagsDto.keyword)}`,
      );
    }
    if (findManyHashtagsDto.startDate) {
      whereConditions.push(
        gte(hashtags.createdAt, findManyHashtagsDto.startDate),
      );
    }
    if (findManyHashtagsDto.endDate) {
      whereConditions.push(
        lte(hashtags.createdAt, findManyHashtagsDto.endDate),
      );
    }
    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db.query.hashtags.findMany({
        where,
        limit: findManyHashtagsDto.limit,
        offset: (findManyHashtagsDto.page - 1) * findManyHashtagsDto.limit,
        orderBy,
      }),
      this.db.select({ count: count() }).from(hashtags).where(where),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    data['_totalCount'] = Number(totalCount);
    return data;
  }

  async getHashtagsStats(findManyHashtagsDto: FindManyHashtagsDto) {
    const whereConditions: any[] = [];
    if (findManyHashtagsDto.keyword) {
      whereConditions.push(
        sql`${createTSQuery<typeof hashtags>(['name'], findManyHashtagsDto.keyword)}`,
      );
    }
    if (findManyHashtagsDto.startDate) {
      whereConditions.push(
        gte(hashtags.createdAt, findManyHashtagsDto.startDate),
      );
    }
    if (findManyHashtagsDto.endDate) {
      whereConditions.push(
        lte(hashtags.createdAt, findManyHashtagsDto.endDate),
      );
    }
    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [total, totalPostsCount, maxPosts] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(hashtags)
        .where(where)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({
          totalPosts: sum(hashtags.postsCount),
        })
        .from(hashtags)
        .where(where)
        .then((res) => res[0]?.totalPosts ?? '0'),
      this.db
        .select({
          maxPosts: sql<number>`MAX(${hashtags.postsCount})`,
        })
        .from(hashtags)
        .where(where)
        .then((res) => res[0]?.maxPosts ?? 0),
    ]);

    const avgPosts =
      Number(total) > 0 ? Number(totalPostsCount) / Number(total) : 0;

    return {
      totalHashtags: Number(total),
      totalPostsCount: Number(totalPostsCount),
      avgPostsPerHashtag: Number(avgPosts.toFixed(1)),
      maxPostsCount: Number(maxPosts),
    };
  }

  async deleteHashtag(hashtagId: string) {
    try {
      const existingHashtag = await this.db.query.hashtags.findFirst({
        where: eq(hashtags.id, hashtagId),
      });

      if (!existingHashtag) {
        throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });
      }

      const deletedHashtag = await this.db
        .delete(hashtags)
        .where(eq(hashtags.id, hashtagId))
        .returning();

      return deletedHashtag[0];
    } catch (error) {
      this.logger.error('Error deleting hashtag.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async deleteManyHashtags(hashtagIds: string[]) {
    const results: any[] = [];
    for (const hashtagId of hashtagIds) {
      try {
        const result = await this.deleteHashtag(hashtagId);
        if (result) results.push(result);
      } catch (error) {
        this.logger.error(
          `Error deleting hashtag ${hashtagId} in bulk operation.`,
          error,
        );
      }
    }
    return results;
  }

  async createHashtag(createHashtagDto: CreateHashtagDto) {
    try {
      const name = createHashtagDto.name.replace(/^#/, '');
      const existingHashtag = await this.db.query.hashtags.findFirst({
        where: eq(hashtags.name, name),
      });

      if (existingHashtag) {
        throw new BadRequestException({
          code: SystemWideErrorCodes.CREATION_FAILED,
          description: 'Hashtag already exists',
        });
      }

      const [newHashtag] = await this.db
        .insert(hashtags)
        .values({ name })
        .returning();

      return newHashtag;
    } catch (error) {
      this.logger.error('Error creating hashtag.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async updateHashtag(hashtagId: string, updateHashtagDto: UpdateHashtagDto) {
    try {
      const name = updateHashtagDto.name.replace(/^#/, '');
      const existingHashtag = await this.db.query.hashtags.findFirst({
        where: eq(hashtags.id, hashtagId),
      });

      if (!existingHashtag) {
        throw new NotFoundException({
          code: SystemWideErrorCodes.NOT_FOUND,
        });
      }

      const nameConflict = await this.db.query.hashtags.findFirst({
        where: and(eq(hashtags.name, name), ne(hashtags.id, hashtagId)),
      });

      if (nameConflict) {
        throw new BadRequestException({
          code: SystemWideErrorCodes.UPDATE_FAILED,
          description: 'Hashtag name already exists',
        });
      }

      const [updatedHashtag] = await this.db
        .update(hashtags)
        .set({ name })
        .where(eq(hashtags.id, hashtagId))
        .returning();

      return updatedHashtag;
    } catch (error) {
      this.logger.error('Error updating hashtag.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
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
          user: { with: { userPrivacySetting: true } },
          postMedia: true,
          postCollaborators: { with: { user: true } },
          postHashtags: {
            with: {
              hashtag: true,
            },
          },
          audioTrack: { with: { uploader: true } },
          location: true,
          postUserTags: { with: { user: true } },
          likes: { with: { user: true }, limit: 1 },
        },
      },
      findManyPostsDto,
    );
  }

  async findManyPosts(findManyPostsDto: FindManyPostsDto, ownerId?: string) {
    return await this.postsRepository.findMany(
      {
        where: and(
          findManyPostsDto.isArchived !== undefined
            ? eq(posts.isArchived, findManyPostsDto.isArchived)
            : eq(posts.isArchived, false),
          ownerId
            ? or(
                eq(posts.userId, ownerId),
                exists(
                  this.db
                    .select()
                    .from(postCollaborators)
                    .where(
                      and(
                        eq(postCollaborators.postId, posts.id),
                        eq(postCollaborators.userId, ownerId),
                        eq(
                          postCollaborators.status,
                          postCollaboratorsStatusEnum.enumValues[1],
                        ),
                      ),
                    ),
                ),
              )
            : undefined,
          findManyPostsDto.ids && findManyPostsDto.ids.length > 0
            ? inArray(posts.id, findManyPostsDto.ids)
            : undefined,
          findManyPostsDto.keyword
            ? sql`${createTSQuery<typeof posts>(['caption'], findManyPostsDto.keyword)}`
            : undefined,
          findManyPostsDto.locationId
            ? eq(posts.locationId, findManyPostsDto.locationId)
            : undefined,
          findManyPostsDto.audioId
            ? eq(posts.audioId, findManyPostsDto.audioId)
            : undefined,
          findManyPostsDto.isReel !== undefined
            ? eq(posts.isReel, findManyPostsDto.isReel)
            : undefined,
          findManyPostsDto.startDate
            ? gte(posts.createdAt, findManyPostsDto.startDate)
            : undefined,
          findManyPostsDto.endDate
            ? lte(posts.createdAt, findManyPostsDto.endDate)
            : undefined,
        ),
        with: {
          user: { with: { userPrivacySetting: true } },
          postMedia: true,
          postCollaborators: { with: { user: true } },
          postHashtags: {
            with: {
              hashtag: true,
            },
          },
          audioTrack: { with: { uploader: true } },
          location: true,
          postUserTags: { with: { user: true } },
          likes: { with: { user: true }, limit: 1 },
        },
      },
      findManyPostsDto,
    );
  }

  async findManyUserPosts(
    findManyPostsDto: FindManyPostsDto,
    user: typeof users.$inferSelect,
  ) {
    const targetUserId = findManyPostsDto.userId || user.id;
    return await this.findManyPosts(findManyPostsDto, targetUserId);
  }

  async findManyUserLikedPosts(
    findManyPostsDto: FindManyPostsDto,
    user: typeof users.$inferSelect,
  ) {
    return await this.postsRepository.findMany(
      {
        where: and(
          eq(posts.isArchived, false),
          exists(
            this.db
              .select()
              .from(likes)
              .where(
                and(eq(likes.postId, posts.id), eq(likes.userId, user.id)),
              ),
          ),
        ),
        orderBy: (p, { desc }) => [
          desc(
            sql`(SELECT created_at FROM likes WHERE post_id = ${p.id} AND user_id = ${user.id} LIMIT 1)`,
          ),
        ],
        with: {
          user: { with: { userPrivacySetting: true } },
          postMedia: true,
          postCollaborators: { with: { user: true } },
          postHashtags: {
            with: {
              hashtag: true,
            },
          },
          audioTrack: true,
          location: true,
          postUserTags: { with: { user: true } },
          likes: { with: { user: true }, limit: 1 },
        },
      },
      findManyPostsDto,
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

      let detectedLanguage: 'en' | 'vi' = 'en';
      if (createPostDto.caption) {
        const lang = await this.moderationService.detectLanguage(
          createPostDto.caption,
        );
        detectedLanguage = lang.startsWith('vi') ? 'vi' : 'en';
      }

      const createdPost = await this.db.transaction(async (tx) => {
        try {
          const [newPost] = await tx
            .insert(posts)
            .values({
              caption: createPostDto.caption,
              userId: user.id,
              commentsDisabled: createPostDto.commentsDisabled,
              likesHidden: createPostDto.likesHidden,
              locationId: createPostDto.locationId,
              isReel,
              language: detectedLanguage,
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

                const inputVideoWidth =
                  metadata.streams[0]?.width ?? metadata.streams[1]?.width;
                const inputVideoHeight =
                  metadata.streams[0]?.height ?? metadata.streams[1]?.height;
                const hasAudio = metadata.streams.some(
                  (stream) => stream.codec_type === 'audio',
                );

                if (!inputVideoWidth || !inputVideoHeight)
                  throw new BadRequestException({
                    code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
                  });

                file.buffer = await this.uploadService.preprocessVideoFile(
                  file.buffer,
                );

                const fileMetadata = createPostDto.videoMetadata?.find(
                  (meta) => meta.name === file.originalname,
                );

                resultUrlObj = await this.uploadService.uploadFile(
                  file,
                  'video',
                  {
                    isReel: isReel.toString(),
                    audioOmitted:
                      fileMetadata?.audioOmitted?.toString() || 'false',
                    millisecondsToExtractThumbnail:
                      fileMetadata?.millisecondsToExtractThumbnail?.toString() ||
                      '1000',
                    inputVideoWidth: inputVideoWidth!.toString(),
                    inputVideoHeight: inputVideoHeight!.toString(),
                    postId: newPost!.id,
                    hasAudio: hasAudio.toString(),
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
                status: isVideo
                  ? postMediaStatus.enumValues[0]
                  : postMediaStatus.enumValues[1],
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

          const audioOmitted = createPostDto.videoMetadata?.[0]?.audioOmitted;

          if (createPostDto.audioId && (audioOmitted || !isReel)) {
            await tx
              .update(posts)
              .set({ audioId: createPostDto.audioId })
              .where(eq(posts.id, newPost!.id));
          }
          if (!audioOmitted && isReel) {
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
                status: 'accepted',
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

            postCollaboratorsInserts.length > 0 &&
              (await tx
                .insert(postCollaborators)
                .values(postCollaboratorsInserts));
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

            const insertedTags =
              taggedUsersInserts.length > 0
                ? await tx
                    .insert(postUserTags)
                    .values(taggedUsersInserts)
                    .onConflictDoNothing()
                    .returning({ id: postUserTags.id })
                : [];

            newPostUserTagsIds = [
              ...insertedTags.map((t) => t.id),
              ...newPostUserTags.filter((tu) => tu.id).map((tu) => tu.id!),
            ];

            await Promise.all(
              updatingPostUserTags.map(async (put) => {
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
            );
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
            updatePostDto.commentsDisabled ||
            updatePostDto.isArchived !== undefined ||
            updatePostDto.playsCount ||
            updatePostDto.sharesCount ||
            updatePostDto.viewsCount
          ) {
            const [updatedPost] = await tx
              .update(posts)
              .set({
                caption: updatePostDto.caption,
                locationId: updatePostDto.locationId || undefined,
                likesHidden: updatePostDto.likesHidden,
                commentsDisabled: updatePostDto.commentsDisabled,
                sharesCount: updatePostDto.sharesCount,
                viewsCount: updatePostDto.viewsCount,
                playsCount: updatePostDto.playsCount,
                isArchived: updatePostDto.isArchived,
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

  async deleteManyPosts(postIds: string[]) {
    const results: any[] = [];
    for (const postId of postIds) {
      try {
        const result = await this.deletePost(postId);
        if (result) results.push(result);
      } catch (error) {
        this.logger.error(
          `Error deleting post ${postId} in bulk operation.`,
          error,
        );
        // Continue with other posts
      }
    }
    return results;
  }

  async findManyTaggedPosts(
    findManyPostsDto: FindManyPostsDto,
    user: typeof users.$inferSelect,
  ) {
    const targetUserId = findManyPostsDto.userId || user.id;
    return await this.postsRepository.findMany(
      {
        where: or(
          inArray(
            posts.id,
            this.db
              .select({ postId: schema.postUserTags.postId })
              .from(schema.postUserTags)
              .where(eq(schema.postUserTags.userId, targetUserId)),
          ),
          inArray(
            posts.id,
            this.db
              .select({ postId: schema.postCollaborators.postId })
              .from(schema.postCollaborators)
              .where(
                and(
                  eq(schema.postCollaborators.userId, targetUserId),
                  eq(schema.postCollaborators.isOriginalAuthor, false),
                ),
              ),
          ),
        ),
        with: {
          user: { with: { userPrivacySetting: true } },
          postUserTags: {
            where: eq(schema.postUserTags.userId, targetUserId),
          },
          postCollaborators: {
            where: eq(schema.postCollaborators.userId, targetUserId),
          },
          postMedia: true,
          likes: { with: { user: true }, limit: 1 },
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
          where: inArray(
            posts.id,
            this.db
              .select({ postId: schema.savedPosts.postId })
              .from(schema.savedPosts)
              .where(eq(schema.savedPosts.userId, user.id)),
          ),
          with: {
            user: { with: { userPrivacySetting: true } },
            savedPosts: {
              where: eq(schema.savedPosts.userId, user.id),
            },
            postMedia: true,
            likes: { with: { user: true }, limit: 1 },
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

  async saveAudioTrack(
    saveAudioTrackDto: SaveAudioTrackDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingAudio = await this.db.query.audioTracks.findFirst({
        where: eq(audioTracks.id, saveAudioTrackDto.audioTrackId),
      });
      if (!existingAudio) {
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });
      }

      const [createdSavedAudio] = await this.db
        .insert(schema.savedAudioTracks)
        .values({
          audioTrackId: saveAudioTrackDto.audioTrackId,
          userId: user.id,
        })
        .returning()
        .onConflictDoNothing();

      return createdSavedAudio;
    } catch (error) {
      this.logger.error('Error saving audio track.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async unsaveAudioTrack(
    audioTrackId: string,
    user: typeof users.$inferSelect,
  ) {
    try {
      const existingSavedAudio = await this.db.query.savedAudioTracks.findFirst(
        {
          where: and(
            eq(schema.savedAudioTracks.audioTrackId, audioTrackId),
            eq(schema.savedAudioTracks.userId, user.id),
          ),
        },
      );
      if (!existingSavedAudio) {
        throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });
      }

      const [deletedSavedAudio] = await this.db
        .delete(schema.savedAudioTracks)
        .where(eq(schema.savedAudioTracks.id, existingSavedAudio.id))
        .returning();

      return deletedSavedAudio;
    } catch (error) {
      this.logger.error('Error unsaving audio track.', error);
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

  async updatePostUserTagStatus(
    updatePostUserTagStatusDto: UpdatePostUserTagStatusDto,
    user: typeof users.$inferSelect,
  ) {
    const existingPost = await this.postsRepository.findFirst({
      where: eq(posts.id, updatePostUserTagStatusDto.postId),
    });

    if (!existingPost)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Post not found.',
      });

    if (
      updatePostUserTagStatusDto.status === postUserTagsStatusEnum.enumValues[0]
    )
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
        description: 'Cannot update tag with "pending" status.',
      });

    const [result] = await this.db
      .update(schema.postUserTags)
      .set({
        status: updatePostUserTagStatusDto.status,
        acceptedAt:
          updatePostUserTagStatusDto.status === 'accepted'
            ? new Date()
            : undefined,
      })
      .where(
        and(
          eq(schema.postUserTags.postId, updatePostUserTagStatusDto.postId),
          eq(schema.postUserTags.userId, user.id),
        ),
      )
      .returning();

    return result;
  }

  async generateCaptionFromLocalMedia(
    files: Express.Multer.File[],
    lang: string,
  ) {
    return await this.moderationService.generateCaptionFromLocalMedia(
      files,
      lang,
    );
  }

  async generateHashtagsFromLocalMedia(files: Express.Multer.File[]) {
    // Fetch top 50 popular hashtags to guide the AI
    const popularHashtags = await this.db
      .select({ name: schema.hashtags.name })
      .from(schema.hashtags)
      .orderBy(desc(schema.hashtags.postsCount))
      .limit(50);

    const hashtagNames = popularHashtags.map((h) => h.name);

    return await this.moderationService.generateHashtagsFromLocalMedia(
      files,
      hashtagNames,
    );
  }

  async translateText(text: string, targetLang: string, sourceLang?: string) {
    return await this.moderationService.translateText(
      text,
      targetLang,
      sourceLang,
    );
  }

  async findManyAudio(findManyAudioDto: FindManyAudioDto) {
    let orderBy: any;
    const { sort } = findManyAudioDto;
    const [sortField, sortOrder] = sort.split(',');
    if (sortField && sortOrder && sortField in audioTracks)
      orderBy =
        sortOrder === 'desc'
          ? [desc(audioTracks[sortField])]
          : [asc(audioTracks[sortField])];

    const whereConditions: any[] = [];
    if (findManyAudioDto.keyword) {
      whereConditions.push(
        sql`${createTSQuery<typeof audioTracks>(['title'], findManyAudioDto.keyword)}`,
      );
    }
    if (findManyAudioDto.startDate) {
      whereConditions.push(
        gte(audioTracks.createdAt, findManyAudioDto.startDate),
      );
    }
    if (findManyAudioDto.endDate) {
      whereConditions.push(
        lte(audioTracks.createdAt, findManyAudioDto.endDate),
      );
    }
    if (findManyAudioDto.isOriginal !== undefined) {
      whereConditions.push(
        eq(audioTracks.isOriginal, findManyAudioDto.isOriginal),
      );
    }
    if (findManyAudioDto.isTrending !== undefined) {
      whereConditions.push(
        eq(audioTracks.isTrending, findManyAudioDto.isTrending),
      );
    }
    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db.query.audioTracks.findMany({
        where,
        limit: findManyAudioDto.limit,
        offset: (findManyAudioDto.page - 1) * findManyAudioDto.limit,
        orderBy,
        with: {
          uploader: true,
        },
      }),
      this.db.select({ count: count() }).from(audioTracks).where(where),
    ]);

    const formattedData = await Promise.all(
      data.map(async (audio) => {
        const postsCountResult = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(eq(posts.audioId, audio.id));
        return {
          ...audio,
          postsCount: Number(postsCountResult[0]?.count || 0),
        };
      }),
    );

    const totalCount = countResult[0]?.count ?? 0;
    formattedData['_totalCount'] = Number(totalCount);
    return formattedData;
  }

  async findManyMySavedAudio(
    findManyAudioDto: FindManyAudioDto,
    user: typeof users.$inferSelect,
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'createdAt,desc',
      } = findManyAudioDto;

      let orderBy: any;
      const [sortField, sortOrder] = sort.split(',');
      orderBy =
        sortOrder === 'desc'
          ? [desc(schema.savedAudioTracks.createdAt)]
          : [asc(schema.savedAudioTracks.createdAt)];

      let where: SQL = eq(schema.savedAudioTracks.userId, user.id);

      if (findManyAudioDto.keyword) {
        const matchingAudios = await this.db
          .select({ id: audioTracks.id })
          .from(audioTracks)
          .where(ilike(audioTracks.title, `%${findManyAudioDto.keyword}%`));

        if (matchingAudios.length === 0) {
          const emptyResult: any[] = [];
          emptyResult['_totalCount'] = 0;
          return emptyResult;
        }

        where = and(
          where,
          inArray(
            schema.savedAudioTracks.audioTrackId,
            matchingAudios.map((a) => a.id),
          ),
        ) as SQL;
      }

      const [data, countResult] = await Promise.all([
        this.db.query.savedAudioTracks.findMany({
          where,
          limit,
          offset: (page - 1) * limit,
          orderBy,
          with: {
            audioTrack: {
              with: {
                uploader: true,
              },
            },
          },
        }),
        this.db
          .select({ count: count() })
          .from(schema.savedAudioTracks)
          .where(where),
      ]);

      const formattedData = await Promise.all(
        data.map(async (saved) => {
          const audio = saved.audioTrack;
          const postsCountResult = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(posts)
            .where(eq(posts.audioId, audio.id));
          return {
            ...audio,
            postsCount: Number(postsCountResult[0]?.count || 0),
            savedAudioTracks: [
              {
                id: saved.id,
                userId: saved.userId,
                audioTrackId: saved.audioTrackId,
                createdAt: saved.createdAt,
              },
            ],
          };
        }),
      );

      const totalCount = countResult[0]?.count ?? 0;
      formattedData['_totalCount'] = Number(totalCount);
      return formattedData;
    } catch (error) {
      this.logger.error('Failed to list saved audio tracks.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getAudioStats(findManyAudioDto: FindManyAudioDto) {
    const whereConditions: any[] = [];
    if (findManyAudioDto.keyword) {
      whereConditions.push(
        sql`${createTSQuery<typeof audioTracks>(['title'], findManyAudioDto.keyword)}`,
      );
    }
    if (findManyAudioDto.startDate) {
      whereConditions.push(
        gte(audioTracks.createdAt, findManyAudioDto.startDate),
      );
    }
    if (findManyAudioDto.endDate) {
      whereConditions.push(
        lte(audioTracks.createdAt, findManyAudioDto.endDate),
      );
    }
    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [total, trending, avgDuration, totalUsage] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(audioTracks)
        .where(where)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(audioTracks)
        .where(and(where, eq(audioTracks.isTrending, true)))
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ avg: sql<number>`avg(${audioTracks.duration})` })
        .from(audioTracks)
        .where(where)
        .then((res) => res[0]?.avg ?? 0),
      this.db
        .select({ total: sum(audioTracks.usageCount) })
        .from(audioTracks)
        .where(where)
        .then((res) => res[0]?.total ?? '0'),
    ]);

    return {
      totalTracks: Number(total),
      trendingTracks: Number(trending),
      avgDuration: Math.round(Number(avgDuration)),
      totalUsageCount: Number(totalUsage),
    };
  }

  async deleteAudio(id: string) {
    const [result] = await this.db
      .delete(audioTracks)
      .where(eq(audioTracks.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('Audio track not found');
    }

    return result;
  }

  async updateAudio(id: string, updateAudioDto: UpdateAudioDto) {
    const [result] = await this.db
      .update(audioTracks)
      .set(updateAudioDto)
      .where(eq(audioTracks.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('Audio track not found');
    }

    return result;
  }

  async deleteManyAudio(ids: string[]) {
    if (!ids || ids.length === 0) {
      return [];
    }

    return await this.db
      .delete(audioTracks)
      .where(inArray(audioTracks.id, ids))
      .returning();
  }

  async findAudioById(id: string) {
    const audio = await this.db.query.audioTracks.findFirst({
      where: eq(audioTracks.id, id),
      with: {
        uploader: true,
        savedAudioTracks: true,
      },
    });

    if (!audio) {
      throw new NotFoundException('Audio track not found');
    }

    // Get usage count
    const postsCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.audioId, id));

    return {
      ...audio,
      postsCount: Number(postsCountResult[0]?.count || 0),
    };
  }

  async getPostsStats(findManyPostsDto: FindManyPostsDto) {
    const where = and(
      findManyPostsDto.userId
        ? eq(posts.userId, findManyPostsDto.userId)
        : undefined,
      findManyPostsDto.locationId
        ? eq(posts.locationId, findManyPostsDto.locationId)
        : undefined,
      findManyPostsDto.audioId
        ? eq(posts.audioId, findManyPostsDto.audioId)
        : undefined,
      findManyPostsDto.startDate
        ? gte(posts.createdAt, findManyPostsDto.startDate)
        : undefined,
      findManyPostsDto.endDate
        ? lte(posts.createdAt, findManyPostsDto.endDate)
        : undefined,
      findManyPostsDto.keyword
        ? sql`${createTSQuery<typeof posts>(['caption'], findManyPostsDto.keyword)}`
        : undefined,
      findManyPostsDto.isArchived !== undefined
        ? eq(posts.isArchived, findManyPostsDto.isArchived)
        : undefined,
      findManyPostsDto.isReel !== undefined
        ? eq(posts.isReel, findManyPostsDto.isReel)
        : undefined,
    );

    const [total, reels, normal, engagement] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(posts)
        .where(where)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(posts)
        .where(and(where, eq(posts.isReel, true)))
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(posts)
        .where(and(where, eq(posts.isReel, false)))
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({
          likes: sum(posts.likesCount),
          comments: sum(posts.commentsCount),
          shares: sum(posts.sharesCount),
          saves: sum(posts.savesCount),
        })
        .from(posts)
        .where(where)
        .then((res) => res[0]),
    ]);

    const totalPosts = Number(total);
    const totalEngagement =
      Number(engagement?.likes || 0) +
      Number(engagement?.comments || 0) +
      Number(engagement?.shares || 0) +
      Number(engagement?.saves || 0);

    return {
      totalPosts,
      reelPosts: Number(reels),
      normalPosts: Number(normal),
      avgEngagement: totalPosts > 0 ? totalEngagement / totalPosts : 0,
    };
  }

  async findManyPostMedia(findManyPostMediaDto: FindManyPostMediaDto) {
    const whereConditions: any[] = [];
    if (findManyPostMediaDto.moderationStatus) {
      whereConditions.push(
        eq(postMedia.moderationStatus, findManyPostMediaDto.moderationStatus),
      );
    }
    if (findManyPostMediaDto.startDate) {
      whereConditions.push(
        gte(postMedia.createdAt, findManyPostMediaDto.startDate),
      );
    }
    if (findManyPostMediaDto.endDate) {
      whereConditions.push(
        lte(postMedia.createdAt, findManyPostMediaDto.endDate),
      );
    }
    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    return await this.postMediaRepository.findMany(
      {
        where,
        with: {
          post: {
            with: {
              user: true,
            },
          },
        },
      },
      findManyPostMediaDto,
    );
  }

  async getPostMediaStats(findManyPostMediaDto: FindManyPostMediaDto) {
    const whereConditions: any[] = [];
    if (findManyPostMediaDto.moderationStatus) {
      whereConditions.push(
        eq(postMedia.moderationStatus, findManyPostMediaDto.moderationStatus),
      );
    }
    if (findManyPostMediaDto.startDate) {
      whereConditions.push(
        gte(postMedia.createdAt, findManyPostMediaDto.startDate),
      );
    }
    if (findManyPostMediaDto.endDate) {
      whereConditions.push(
        lte(postMedia.createdAt, findManyPostMediaDto.endDate),
      );
    }
    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [total, pending, approved, flagged] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(postMedia)
        .where(where)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(postMedia)
        .where(
          where
            ? and(where, eq(postMedia.moderationStatus, 'pending'))
            : eq(postMedia.moderationStatus, 'pending'),
        )
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(postMedia)
        .where(
          where
            ? and(where, eq(postMedia.moderationStatus, 'approved'))
            : eq(postMedia.moderationStatus, 'approved'),
        )
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(postMedia)
        .where(
          where
            ? and(where, eq(postMedia.moderationStatus, 'flagged'))
            : eq(postMedia.moderationStatus, 'flagged'),
        )
        .then((res) => res[0]?.count ?? 0),
    ]);

    return {
      totalMedia: Number(total),
      pendingCount: Number(pending),
      approvedCount: Number(approved),
      flaggedCount: Number(flagged),
    };
  }

  async updatePostMediaModeration(
    mediaId: string,
    updatePostMediaModerationDto: UpdatePostMediaModerationDto,
  ) {
    try {
      const existingMedia = await this.db.query.postMedia.findFirst({
        where: eq(postMedia.id, mediaId),
      });

      if (!existingMedia) {
        throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });
      }

      const updatedMedia = await this.postMediaRepository.update(mediaId, {
        moderationStatus: updatePostMediaModerationDto.moderationStatus,
        moderationReason: updatePostMediaModerationDto.moderationReason,
      });

      return updatedMedia;
    } catch (error) {
      this.logger.error('Error updating post media moderation status.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPDATE_FAILED,
      });
    }
  }

  async updateManyPostMediaModeration(
    updateManyDto: UpdateManyPostMediaModerationDto,
  ) {
    const results: any[] = [];
    for (const mediaId of updateManyDto.ids) {
      try {
        const result = await this.updatePostMediaModeration(mediaId, {
          moderationStatus: updateManyDto.moderationStatus,
          moderationReason: updateManyDto.moderationReason,
        });
        if (result) results.push(result);
      } catch (error) {
        this.logger.error(
          `Error updating post media ${mediaId} in bulk operation.`,
          error,
        );
      }
    }
    return results;
  }
}
