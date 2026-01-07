import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { UploadService } from '@repo/common';
import {
  audioTracks,
  DATABASE_CONNECTION,
  hashtags,
  postHashtags,
  postMedia,
  posts,
  postStatus,
  schema,
  users,
} from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  formatDateWithLocale,
  POST_VIDEO_DURATION_LIMIT_IF_MORE_THAN_1_VIDEOS,
  SystemWideErrorCodes,
  SystemWideErrorMessages,
  VIDEO_DURATION_LIMITS,
} from '@repo/types';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly uploadService: UploadService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {}

  async createPost(
    media: Array<Express.Multer.File>,
    createPostDto: CreatePostDto,
    user: typeof users.$inferInsert,
  ) {
    try {
      const isReel =
        media.length === 1 && media[0]?.mimetype.startsWith('video/');
      const postMediaInsertUrls: Pick<
        typeof postMedia.$inferInsert,
        'mediaType' | 'originalRawFileUrl' | 'thumbnailUrl'
      >[] = [];
      const haveVideo = media.some((file) =>
        file.mimetype.startsWith('video/'),
      );
      const postVideoDurationArr: number[] = [];

      await this.db.transaction(async (tx) => {
        try {
          const newPost = await tx
            .insert(posts)
            .values({
              caption: createPostDto.caption,
              userId: user.id,
              commentsDisabled: createPostDto.commentsDisabled,
              likesHidden: createPostDto.likesHidden,
              status: haveVideo
                ? postStatus.enumValues[0]
                : postStatus.enumValues[1],
              isReel,
            })
            .returning({ id: posts.id });

          const postMediaInserts = await Promise.all<
            Promise<typeof postMedia.$inferInsert>
          >(
            media.map(async (file, idx) => {
              const isImage = file.mimetype.startsWith('image/');
              const isVideo = file.mimetype.startsWith('video/');
              const width = isImage
                ? parseInt(
                    this.configService.get<string>('DEFAULT_POST_IMAGE_WIDTH')!,
                  )
                : parseInt(
                    this.configService.get<string>('DEFAULT_POST_VIDEO_WIDTH')!,
                  );
              const height = isImage
                ? parseInt(
                    this.configService.get<string>(
                      'DEFAULT_POST_IMAGE_HEIGHT',
                    )!,
                  )
                : parseInt(
                    this.configService.get<string>(
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

                if (isReel && duration > VIDEO_DURATION_LIMITS.REEL)
                  throw new BadRequestException({
                    code: SystemWideErrorCodes.UPLOAD_REEL_VIDEO_DURATION_EXCEEDED,
                  });
                else if (!isReel && duration > VIDEO_DURATION_LIMITS.POST)
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
                    audioOmitted: isReel
                      ? createPostDto.audioOmitted?.toString() || 'false'
                      : 'true',
                    millisecondsToExtractThumbnail:
                      createPostDto.millisecondsToExtractThumbnail?.toString() ||
                      '1000',
                    inputVideoWidth: inputVideoWidth!.toString(),
                    inputVideoHeight: inputVideoHeight!.toString(),
                    postId: newPost[0]!.id,
                  },
                );

                thumbnailUrl =
                  resultUrlObj.mediaUrl.split('/').slice(0, -1).join('/') +
                  '/' +
                  this.configService.get<string>(
                    'GOOGLE_OUTPUT_THUMBNAIL_FILE_NAME',
                  )!;

                postMediaInsertUrls[idx] = {
                  mediaType: file.mimetype,
                  originalRawFileUrl: resultUrlObj.originalRawFileUrl,
                  thumbnailUrl,
                };
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
                postId: newPost[0]!.id,
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

          if (
            postVideoDurationArr.length > 1 &&
            postVideoDurationArr.some(
              (vidDuration) =>
                vidDuration > POST_VIDEO_DURATION_LIMIT_IF_MORE_THAN_1_VIDEOS,
            )
          )
            throw new BadRequestException({
              code: SystemWideErrorCodes.UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION,
              description:
                SystemWideErrorMessages.UPLOAD_POST_VIDEO_DURATION_IF_MORE_THAN_2_VIDEOS_EXCEEDED,
            });

          if (postMediaInserts.length > 0) {
            await tx.insert(postMedia).values(postMediaInserts);
          }

          if (createPostDto.hashtagIds && createPostDto.hashtagIds.length > 0) {
            const postHashtagsInserts = createPostDto.hashtagIds.map<
              typeof postHashtags.$inferInsert
            >((hashtagId) => ({
              postId: newPost[0]!.id,
              hashtagId,
            }));
            await tx.insert(postHashtags).values(postHashtagsInserts);
          }
          if (
            createPostDto.newHashtags &&
            createPostDto.newHashtags.length > 0
          ) {
            const newHashtagInserts = createPostDto.newHashtags.map<
              typeof hashtags.$inferInsert
            >((name) => ({
              name,
            }));
            await tx.insert(hashtags).values(newHashtagInserts);
          }

          if (createPostDto.audioId) {
            await tx
              .update(posts)
              .set({ audioId: createPostDto.audioId })
              .where(eq(posts.id, newPost[0]!.id));
          }
          if (!createPostDto.audioOmitted && isReel) {
            const audioUrl =
              postMediaInserts[0]!.mediaUrl.split('/').slice(0, -1).join('/') +
              `/${this.configService.get<string>('GOOGLE_OUTPUT_AUDIO_FILE_NAME')}`;
            const duration = postMediaInserts[0]!.duration!;
            const newAudioTrack = await tx
              .insert(audioTracks)
              .values({ uploaderId: user.id, audioUrl, duration })
              .returning({ id: audioTracks.id });
            await tx
              .update(posts)
              .set({ audioId: newAudioTrack[0]!.id })
              .where(eq(posts.id, newPost[0]!.id));
          }
        } catch (error) {
          this.logger.error('Error during post creating transaction.', error);
          if (postMediaInsertUrls.length > 0)
            await Promise.all(
              postMediaInsertUrls.map(async (media) => {
                await this.uploadService.deleteFile(
                  media.originalRawFileUrl!,
                  media.mediaType,
                );
                if (media.mediaType.startsWith('image/'))
                  await this.uploadService.deleteFile(
                    media.thumbnailUrl!,
                    'image/webp',
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
        code: SystemWideErrorCodes.POST_CREATION_FAILED,
      });
    }
  }

  async updatePost() {}
}
