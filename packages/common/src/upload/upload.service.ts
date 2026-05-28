import { Storage } from '@google-cloud/storage';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import { SystemWideErrorCodes } from '@repo/types';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFile, readFile, unlink } from 'fs/promises';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private storage!: Storage;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const saKeyFile = this.configService.get<string>(
      'GOOGLE_CS_SA_KEY_FILE_NAME',
    );
    let keyFilename: string | undefined = undefined;

    if (saKeyFile) {
      keyFilename = join(__dirname, saKeyFile);
    }

    this.storage = new Storage({
      projectId: this.configService.getOrThrow('GOOGLE_PROJECT_ID'),
      keyFilename: keyFilename,
    });
  }

  async preprocessImageFile(
    buffer: Buffer<ArrayBufferLike>,
    widthOrOptions?: number | sharp.ResizeOptions,
    height?: number,
  ) {
    try {
      return await sharp(buffer)
        .resize(widthOrOptions, height, { fit: 'cover' })
        .sharpen()
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Error processing image file.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
      });
    }
  }

  async extractVideoThumbnail(
    buffer: Buffer<ArrayBufferLike>,
    timeInMilliseconds: number = 1000,
    width?: number,
    height?: number,
  ) {
    return new Promise<Buffer>((resolve, reject) => {
      const bufferStream = Readable.from(buffer);
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      passThrough.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      let resolved = false;

      const command = ffmpeg(bufferStream)
        .seekInput(timeInMilliseconds / 1000)
        .frames(1)
        .outputFormat('image2')
        .videoCodec('mjpeg');

      if (width || height) {
        command.size(`${width || '?'}x${height || '?'}`).aspect('3:4');
      }

      command
        .on('error', (err) => {
          if (!resolved) {
            resolved = true;
            this.logger.error('Error extracting thumbnail.', err);
            reject(err);
          }
        })
        .on('end', () => {
          if (!resolved) {
            resolved = true;
            this.logger.log('Thumbnail extraction finished.');
            resolve(Buffer.concat(chunks));
          }
        })
        .pipe(passThrough, { end: true });
    });
  }

  async getVideoMetadata(buffer: Buffer<ArrayBufferLike>) {
    return new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      const bufferStream = Readable.from(buffer);

      ffmpeg(bufferStream).ffprobe((error, metadata) => {
        if (error && error instanceof Error) {
          this.logger.error('Error getting video duration.', error);
          reject(
            new InternalServerErrorException({
              code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
            }),
          );
          return;
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        );
        if (videoStream && videoStream.rotation) {
          const width = videoStream?.width;
          const height = videoStream?.height;
          let rotation =
            metadata.format.tags?.rotate ||
            videoStream.tags?.rotate ||
            videoStream.rotation ||
            0;
          rotation = Math.abs(parseInt(videoStream.rotation as string) || 0);

          if (rotation === 90 || rotation === 270) {
            const temp = width;
            videoStream.width = height;
            videoStream.height = temp;
          }
        }

        const videoMetadata = metadata;
        if (videoMetadata) {
          resolve(videoMetadata);
        } else {
          this.logger.error('Could not retrieve video metadata.', error);
          reject(
            new InternalServerErrorException({
              code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
            }),
          );
        }
      });
    });
  }

  async preprocessVideoFile(
    buffer: Buffer<ArrayBufferLike>,
    width?: number,
    height?: number,
  ) {
    const tempInputId = randomUUID();
    const tempInputPath = join(tmpdir(), `input-${tempInputId}.mp4`);
    const tempOutputPath = join(tmpdir(), `output-${tempInputId}.mp4`);

    try {
      await writeFile(tempInputPath, buffer);

      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(tempInputPath)
          .videoCodec('libx264')
          .audioCodec('aac');

        // Build video filters: scale down if dimensions provided, always ensure even dimensions
        const videoFilters: string[] = [];
        if (width && height) {
          // Scale to fit within target dimensions, maintain aspect ratio
          videoFilters.push(
            `scale='min(${width},iw)':'min(${height},ih)':force_original_aspect_ratio=decrease`,
          );
        }
        // Ensure dimensions are divisible by 2 (required by libx264)
        videoFilters.push(`pad=ceil(iw/2)*2:ceil(ih/2)*2`);

        if (videoFilters.length > 0) {
          command.videoFilters(videoFilters);
        }

        command
          .outputOptions([
            '-preset ultrafast', // Fastest encoding with minimal quality loss at this CRF
            '-crf 23', // Visually lossless for most content (x264 default)
            '-maxrate 4M', // Cap bitrate
            '-bufsize 8M', // Larger buffer for smoother bitrate distribution
            '-b:a 128k', // Good audio quality
            '-ac 2', // Stereo audio
            '-movflags +faststart', // Suitable for streaming immediately
            '-pix_fmt yuv420p',
            '-threads 0', // Use all available CPU cores
          ])
          .output(tempOutputPath)
          .on('error', (error) => {
            this.logger.error('Error processing video file.', error);
            reject(
              new InternalServerErrorException({
                code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
              }),
            );
          })
          .on('end', () => {
            this.logger.log('Processing video finished.');
            resolve();
          })
          .run();
      });

      const processedBuffer = await readFile(tempOutputPath);
      return processedBuffer;
    } finally {
      await unlink(tempInputPath).catch(() => {});
      await unlink(tempOutputPath).catch(() => {});
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folderName: string,
    metadata: { [key: string]: string } = {},
  ) {
    let bucketName: string;
    if (file.mimetype.startsWith('image/'))
      bucketName = this.configService.getOrThrow<string>(
        'GOOGLE_IMAGES_BUCKET_NAME',
      )!;
    else if (file.mimetype.startsWith('video/'))
      bucketName = this.configService.getOrThrow<string>(
        'GOOGLE_INPUT_VIDEO_BUCKET_NAME',
      )!;
    else
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE,
      });

    try {
      const fileName = `${folderName}/${randomUUID()}-${file.originalname}`;
      const fileFolder = fileName.split('.').slice(0, -1).join('.');
      const bucketFile = this.storage.bucket(bucketName).file(fileName);

      await bucketFile.save(file.buffer, {
        contentType: file.mimetype,
        metadata: {
          metadata,
        },
      });

      const resultUrlObj: { originalRawFileUrl: string; mediaUrl: string } = {
        originalRawFileUrl: fileName,
        mediaUrl: file.mimetype.startsWith('video/')
          ? `${fileFolder}/${this.configService.getOrThrow<string>('GOOGLE_HLS_OUTPUT_VIDEO_FILE_NAME')}`
          : fileName,
      };

      return resultUrlObj;
    } catch (error) {
      this.logger.error('Error uploading file to Cloud Storage.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPLOAD_FILE_FAILED,
      });
    }
  }

  async deleteFile(fileName: string, mimetype: string) {
    if (!fileName || !mimetype) return;

    let bucketName: string;
    if (mimetype.startsWith('image/'))
      bucketName = this.configService.getOrThrow<string>(
        'GOOGLE_IMAGES_BUCKET_NAME',
      )!;
    else if (mimetype.startsWith('video/'))
      bucketName = this.configService.getOrThrow<string>(
        'GOOGLE_INPUT_VIDEO_BUCKET_NAME',
      )!;
    else
      throw new BadRequestException({
        code: SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE,
      });

    // Clean fileName to remove bucket name or host domain if present
    let cleanPath = fileName;

    // If it's a full URL, extract the path
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      try {
        const url = new URL(cleanPath);
        cleanPath = url.pathname;
      } catch (e) {
        // Ignore URL parsing errors
      }
    }

    // Remove leading slash
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }

    // If it starts with the bucket name, remove it (e.g. "image-st/avatars/...")
    if (cleanPath.startsWith(bucketName + '/')) {
      cleanPath = cleanPath.substring(bucketName.length + 1);
    }

    try {
      await this.storage.bucket(bucketName).file(cleanPath).delete();
      this.logger.log(
        `File gs://${bucketName}/${cleanPath} deleted successfully.`,
      );
    } catch (error: any) {
      const isNotFoundError =
        error?.code === 404 ||
        error?.code === '404' ||
        error?.statusCode === 404 ||
        error?.statusCode === '404' ||
        error?.message?.includes('notFound') ||
        error?.message?.includes('No such object') ||
        error?.errors?.some(
          (e: any) =>
            e.reason === 'notFound' || e.message?.includes('No such object'),
        );

      if (isNotFoundError) {
        this.logger.warn(
          `File gs://${bucketName}/${cleanPath} not found for deletion. Ignoring.`,
        );
        return;
      }
      this.logger.error(
        `ERROR deleting file gs://${bucketName}/${cleanPath}.`,
        error,
      );
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPLOAD_FILE_FAILED,
      });
    }
  }

  async getBucketSize(bucketName: string) {
    const bucket = this.storage.bucket(bucketName);
    const [files] = await bucket.getFiles();

    let totalBytes = 0;
    let fileCount = 0;

    for (const file of files) {
      const size = parseInt(file.metadata.size?.toString() || '0', 10);
      totalBytes += size;
      fileCount++;
    }

    return { bucketName, totalBytes, fileCount };
  }

  async getAllBucketsConsumption() {
    this.logger.log(
      `\n📦 Fetching storage consumption for project: ${process.env.GCP_PROJECT_ID}\n`,
    );
    this.logger.log('='.repeat(65));

    const [buckets] = await this.storage.getBuckets();

    if (buckets.length === 0) {
      this.logger.log('No buckets found in this project.');
      return;
    }

    const results = await Promise.all(
      buckets.map((b) => this.getBucketSize(b.name)),
    );

    let grandTotalBytes = 0;
    let grandTotalFiles = 0;

    // Print per-bucket summary
    for (const { bucketName, totalBytes, fileCount } of results) {
      this.logger.log(`🪣  Bucket : ${bucketName}`);
      this.logger.log(`   Size   : ${this.formatBytes(totalBytes)}`);
      this.logger.log(`   Files  : ${fileCount.toLocaleString()}`);
      this.logger.log('-'.repeat(65));
      grandTotalBytes += totalBytes;
      grandTotalFiles += fileCount;
    }

    // Print project-wide totals
    this.logger.log('\n📊 PROJECT TOTAL');
    this.logger.log(`   Total Size  : ${this.formatBytes(grandTotalBytes)}`);
    this.logger.log(`   Total Files : ${grandTotalFiles.toLocaleString()}`);
    this.logger.log(`   Buckets     : ${buckets.length}`);
    this.logger.log('='.repeat(65));

    return results;
  }

  async getStorageUsagePercent(
    quotaBytes: number = 50 * 1024 ** 3, // Default to 50 GB
    bucketName?: string,
  ) {
    if (!quotaBytes || quotaBytes <= 0) {
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
        message:
          'quotaBytes must be a positive number representing your storage quota.',
      });
    }

    let usedBytes = 0;

    if (bucketName) {
      const result = await this.getBucketSize(bucketName);
      usedBytes = result.totalBytes;
    } else {
      const [buckets] = await this.storage.getBuckets();
      const results = await Promise.all(
        buckets.map((b) => this.getBucketSize(b.name)),
      );
      usedBytes = results.reduce((sum, r) => sum + r.totalBytes, 0);
    }

    const percent = Math.min((usedBytes / quotaBytes) * 100, 100);

    return {
      usedBytes,
      quotaBytes,
      percent: parseFloat(percent.toFixed(2)),
      percentFormatted: `${percent.toFixed(2)}%`,
      usedFormatted: this.formatBytes(usedBytes),
      quotaFormatted: this.formatBytes(quotaBytes),
    };
  }

  private formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
}
