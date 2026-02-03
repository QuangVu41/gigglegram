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
import { FilterStoriesDto } from '@/src/stories/dto/filter-stories.dto';
import {
  DATABASE_CONNECTION,
  schema,
  stories,
  storyStatus,
  users,
} from '@repo/database';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import {
  SYSTEM_SETTINGS_SERVICE_NAME,
  SystemSettingsServiceClient,
  SystemWideErrorCodes,
} from '@repo/types';
import { type ClientGrpc } from '@nestjs/microservices';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import { formatDateWithLocale, UploadService } from '@repo/common';
import { eq } from 'drizzle-orm';

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
  ) {}

  onModuleInit() {
    this.systemSettingsService =
      this.systemSettingsClient.getService<SystemSettingsServiceClient>(
        SYSTEM_SETTINGS_SERVICE_NAME,
      );
  }

  async findManyStories(filterStoriesDto: FilterStoriesDto) {
    return await this.storiesRepository.findMany({}, filterStoriesDto);
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

      await this.db.transaction(async (tx) => {
        try {
          const [newStory] = await tx
            .insert(stories)
            .values({
              userId: user.id,
            })
            .returning({ id: stories.id });

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

            const inputVideoWidth = metadata.streams[0]?.width;
            const inputVideoHeight = metadata.streams[0]?.height;

            if (!inputVideoWidth || !inputVideoHeight)
              throw new BadRequestException({
                code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
              });

            width = inputVideoWidth;
            height = inputVideoHeight;

            media.buffer = await this.uploadService.preprocessVideoFile(
              media.buffer,
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
          expiresAt.setDate(
            expiresAt.getDate() +
              (settings['story.expiration_hours']?.intValue ||
                parseInt(
                  this.configService.getOrThrow<string>(
                    'DEFAULT_STORY_EXPIRATION_HOURS',
                  )!,
                )),
          );

          await tx
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
            .where(eq(stories.id, newStory!.id));
        } catch (error) {
          this.logger.error('Error during story creating transaction.', error);
          await this.uploadService.deleteFile(
            storyMediaInsertUrl.originalRawFileUrl!,
            storyMediaInsertUrl.mediaType!,
          );
          throw error;
        }
      });
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
      });

      if (!existingStory)
        throw new BadRequestException({
          code: SystemWideErrorCodes.NOT_FOUND,
        });

      await this.storiesRepository.delete(existingStory.id);

      await this.uploadService.deleteFile(
        existingStory.originalRawFileUrl!,
        existingStory.mediaType!,
      );
    } catch (error) {
      this.logger.error('Error deleting story.', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.DELETION_FAILED,
      });
    }
  }
}
