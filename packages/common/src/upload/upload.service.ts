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

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private storage!: Storage;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.storage = new Storage({
      projectId: this.configService.getOrThrow('GOOGLE_PROJECT_ID'),
      keyFilename: join(
        __dirname,
        this.configService.getOrThrow('GOOGLE_CS_SA_KEY_FILE_NAME')!,
      ),
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

      passThrough.on('end', () => {
        this.logger.log('Thumbnail extraction finished.');
        resolve(Buffer.concat(chunks));
      });

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
          this.logger.error('Error extracting thumbnail.', err);
          reject(err);
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

  async preprocessVideoFile(buffer: Buffer<ArrayBufferLike>) {
    return await new Promise<Buffer>((resolve, reject) => {
      const bufferStream = Readable.from(buffer);
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      passThrough.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      passThrough.on('end', () => {
        this.logger.log('Processing video finished.');
        resolve(Buffer.concat(chunks));
      });

      ffmpeg(bufferStream)
        .outputFormat('mp4')
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset veryfast', // Fast processing, decent compression
          '-crf 28', // Good compression ratio
          '-maxrate 4M', // Cap bitrate
          '-bufsize 3M',
          '-b:a 96k', // Reduce audio bitrate
          '-movflags frag_keyframe+empty_moov',
          '-pix_fmt yuv420p',
        ])
        .on('error', (error) => {
          this.logger.error('Error processing video file.', error);
          reject(
            new InternalServerErrorException({
              code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
            }),
          );
        })
        .pipe(passThrough, { end: true });
    });
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

    try {
      await this.storage.bucket(bucketName).file(fileName).delete();
      this.logger.log(
        `File gs://${bucketName}/${fileName} deleted successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `ERROR deleting file gs://${bucketName}/${fileName}.`,
        error,
      );
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.UPLOAD_FILE_FAILED,
      });
    }
  }
}
