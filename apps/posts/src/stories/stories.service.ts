import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { StoriesRepository } from '@/src/stories/stories.repository';
import { FindManyStoriesDto } from '@/src/stories/dto/find-many-stories.dto';
import {
  DATABASE_CONNECTION,
  schema,
  stories,
  storyHighlights,
  storyStatus,
  users,
} from '@repo/database';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import {
  SYSTEM_SETTINGS_SERVICE_NAME,
  SystemSettingsServiceClient,
  SystemWideErrorCodes,
  KAFKA_SERVICE_NAME,
  POSTS_TOPIC_STORY_CREATED,
  StoryCreatedEvent,
} from '@repo/types';
import { type ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import { formatDateWithLocale, UploadService } from '@repo/common';
import {
  and,
  eq,
  lt,
  or,
  exists,
  like,
  gte,
  lte,
  sum,
  count,
} from 'drizzle-orm';

@Injectable()
export class StoriesService implements OnModuleInit {
  private readonly logger = new Logger(StoriesService.name);
  private systemSettingsService!: SystemSettingsServiceClient;

  constructor(
    private readonly uploadService: UploadService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    private readonly storiesRepository: StoriesRepository,
    @Inject(SYSTEM_SETTINGS_SERVICE_NAME)
    private readonly systemSettingsClient: ClientGrpc,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafka,
  ) {}

  onModuleInit() {
    this.systemSettingsService =
      this.systemSettingsClient.getService<SystemSettingsServiceClient>(
        SYSTEM_SETTINGS_SERVICE_NAME,
      );
  }

  async findManyStories(findManyStoriesDto: FindManyStoriesDto) {
    const { keyword, isExpired, startDate, endDate } = findManyStoriesDto;
    const whereConditions: any[] = [];

    if (keyword) {
      whereConditions.push(
        exists(
          this.db
            .select()
            .from(users)
            .where(
              and(
                eq(users.id, stories.userId),
                or(
                  like(users.username, `%${keyword}%`),
                  like(users.name, `%${keyword}%`),
                ),
              ),
            ),
        ),
      );
    }

    if (isExpired !== undefined) {
      const now = new Date();
      if (isExpired) {
        whereConditions.push(lt(stories.expiresAt, now));
      } else {
        whereConditions.push(gte(stories.expiresAt, now));
      }
    }

    if (startDate) {
      whereConditions.push(gte(stories.createdAt, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(stories.createdAt, endDate));
    }

    return await this.storiesRepository.findMany(
      {
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: { user: true },
      },
      findManyStoriesDto,
    );
  }

  async findManyUserStories(
    findManyStoriesDto: FindManyStoriesDto,
    user: typeof users.$inferSelect,
  ) {
    return await this.storiesRepository.findMany(
      {
        where: eq(stories.userId, user.id),
      },
      findManyStoriesDto,
    );
  }

  async findManyUserArchivedStories(
    findManyStoriesDto: FindManyStoriesDto,
    user: typeof users.$inferSelect,
  ) {
    return await this.storiesRepository.findMany(
      {
        where: and(
          eq(stories.userId, user.id),
          lt(stories.expiresAt, new Date()),
        ),
      },
      findManyStoriesDto,
    );
  }

  async createStory(
    media: Express.Multer.File,
    user: typeof users.$inferSelect,
  ) {
    try {
      const { settings } = await firstValueFrom(
        this.systemSettingsService.findSettingsByPrefix(
          {
            prefixes: ['image', 'video', 'story'],
          },
          {} as Metadata,
        ),
      );
      const isVideo = media.mimetype.startsWith('video/');
      const isImage = media.mimetype.startsWith('image/');

      let storyMediaInsertUrl: Pick<
        typeof stories.$inferInsert,
        'mediaType' | 'originalRawFileUrl' | 'thumbnailUrl'
      > = {};

      const createdStory = await this.db.transaction(async (tx) => {
        try {
          const [newStory] = await tx
            .insert(stories)
            .values({
              userId: user.id,
            })
            .returning();

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
              media.buffer,
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
            else if (
              duration >
              (settings['video.story_max_duration']?.intValue ||
                parseInt(
                  this.configService.getOrThrow<string>(
                    'DEFAULT_REEL_MAX_VIDEO_DURATION',
                  )!,
                ))
            )
              throw new BadRequestException({
                code: SystemWideErrorCodes.UPLOAD_REEL_VIDEO_DURATION_EXCEEDED,
              });

            const inputVideoWidth =
              metadata.streams[0]?.width || metadata.streams[1]?.width;
            const inputVideoHeight =
              metadata.streams[0]?.height || metadata.streams[1]?.height;
            const hasAudio = metadata.streams.some(
              (stream) => stream.codec_type === 'audio',
            );

            if (!inputVideoWidth || !inputVideoHeight)
              throw new BadRequestException({
                code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
              });

            width = inputVideoWidth;
            height = inputVideoHeight;

            media.buffer = await this.uploadService.preprocessVideoFile(
              media.buffer,
              width,
              height,
            );

            resultUrlObj = await this.uploadService.uploadFile(
              media,
              'stories',
              {
                isReel: 'false',
                audioOmitted: 'false',
                millisecondsToExtractThumbnail: '1000',
                inputVideoWidth: inputVideoWidth!.toString(),
                inputVideoHeight: inputVideoHeight!.toString(),
                storyId: newStory!.id,
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
            media.buffer = await this.uploadService.preprocessImageFile(
              media.buffer,
              width,
              height,
            );
            media.originalname =
              media.originalname.split('.').slice(0, -1).join('.') + '.webp';
            media.mimetype = 'image/webp';

            resultUrlObj = await this.uploadService.uploadFile(
              media,
              'stories',
            );
            thumbnailUrl = resultUrlObj.mediaUrl;
          }

          storyMediaInsertUrl = {
            mediaType: media.mimetype,
            originalRawFileUrl: resultUrlObj.originalRawFileUrl,
            thumbnailUrl,
          };

          const altText = isImage
            ? `Photo story by ${user.name} on ${formatDateWithLocale(new Date())}.`
            : `A thumbnail image of a video story by ${user.name} on ${formatDateWithLocale(new Date())}.`;

          const expiresAt = new Date();
          expiresAt.setHours(
            expiresAt.getHours() +
              (settings['story.expiration_hours']?.intValue ||
                parseInt(
                  this.configService.getOrThrow<string>(
                    'DEFAULT_STORY_EXPIRATION_HOURS',
                  )!,
                )),
          );

          const [updatedStory] = await tx
            .update(stories)
            .set({
              mediaUrl: resultUrlObj.mediaUrl,
              originalRawFileUrl: resultUrlObj.originalRawFileUrl,
              mediaType: media.mimetype,
              thumbnailUrl: thumbnailUrl,
              duration,
              width,
              height,
              altText,
              expiresAt,
              status: isImage
                ? storyStatus.enumValues[1]
                : storyStatus.enumValues[0],
            })
            .where(eq(stories.id, newStory!.id))
            .returning();

          return updatedStory;
        } catch (error) {
          this.logger.error('Error during story creating transaction.', error);
          await this.uploadService.deleteFile(
            storyMediaInsertUrl.originalRawFileUrl!,
            storyMediaInsertUrl.mediaType!,
          );
          throw error;
        }
      });

      if (createdStory) {
        this.kafkaClient.emit(POSTS_TOPIC_STORY_CREATED, {
          storyId: createdStory.id,
        } as StoryCreatedEvent);
      }

      return createdStory;
    } catch (error) {
      this.logger.error('Error creating new story.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.CREATION_FAILED,
      });
    }
  }

  async deleteStory(storyId: string) {
    try {
      const existingStory = await this.storiesRepository.findFirst({
        where: eq(stories.id, storyId),
        with: {
          storyHighlightItems: {
            columns: {
              highlightId: true,
            },
            with: {
              highlight: {
                columns: {
                  storiesCount: true,
                },
              },
            },
          },
        },
      });

      if (!existingStory)
        throw new BadRequestException({
          code: SystemWideErrorCodes.NOT_FOUND,
        });

      const deletedStory = await this.db.transaction(async (tx) => {
        const [deletedStory] = await tx
          .delete(stories)
          .where(eq(stories.id, storyId))
          .returning();

        await Promise.all(
          existingStory.storyHighlightItems.map(async (item) =>
            tx
              .update(storyHighlights)
              .set({
                storiesCount: item.highlight.storiesCount - 1,
              })
              .where(eq(storyHighlights.id, item.highlightId)),
          ),
        );

        await this.uploadService.deleteFile(
          existingStory.originalRawFileUrl!,
          existingStory.mediaType!,
        );

        return deletedStory;
      });

      return deletedStory;
    } catch (error) {
      this.logger.error('Error deleting story.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }

  async getStoriesStats(findManyStoriesDto: FindManyStoriesDto) {
    const { keyword, isExpired, startDate, endDate } = findManyStoriesDto;
    const whereConditions: any[] = [];

    if (keyword) {
      whereConditions.push(
        exists(
          this.db
            .select()
            .from(users)
            .where(
              and(
                eq(users.id, stories.userId),
                or(
                  like(users.username, `%${keyword}%`),
                  like(users.name, `%${keyword}%`),
                ),
              ),
            ),
        ),
      );
    }

    if (isExpired !== undefined) {
      const now = new Date();
      if (isExpired) {
        whereConditions.push(lt(stories.expiresAt, now));
      } else {
        whereConditions.push(gte(stories.expiresAt, now));
      }
    }

    if (startDate) {
      whereConditions.push(gte(stories.createdAt, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(stories.createdAt, endDate));
    }

    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const now = new Date();

    const [total, active, expired, viewsRes] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(stories)
        .where(where)
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(stories)
        .where(
          and(
            where,
            eq(stories.status, 'published'),
            gte(stories.expiresAt, now),
          ),
        )
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({ count: count() })
        .from(stories)
        .where(
          and(
            where,
            eq(stories.status, 'published'),
            lt(stories.expiresAt, now),
          ),
        )
        .then((res) => res[0]?.count ?? 0),
      this.db
        .select({
          totalViews: sum(stories.viewsCount),
        })
        .from(stories)
        .where(where)
        .then((res) => res[0]),
    ]);

    const totalStories = Number(total);
    const avgViewsPerStory =
      totalStories > 0 ? Number(viewsRes?.totalViews || 0) / totalStories : 0;

    return {
      totalStories,
      activeStories: Number(active),
      expiredStories: Number(expired),
      avgViewsPerStory,
    };
  }

  async deleteManyStories(storyIds: string[]) {
    const results: any[] = [];
    for (const storyId of storyIds) {
      try {
        const result = await this.deleteStory(storyId);
        if (result) results.push(result);
      } catch (error) {
        this.logger.error(
          `Error deleting story ${storyId} in bulk operation.`,
          error,
        );
      }
    }
    return results;
  }
}
