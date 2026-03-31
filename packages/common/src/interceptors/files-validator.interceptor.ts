import { FileTypeBasedOnMimetypeValidator } from '@common/src/validators/file-type-based-on-mimetype-validator.validator';

import {
  CallHandler,
  ExecutionContext,
  Inject,
  NestInterceptor,
  OnModuleInit,
  ParseFilePipeBuilder,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SYSTEM_SETTINGS_SERVICE_NAME,
  SystemSettingsServiceClient,
  SystemWideErrorCodes,
} from '@repo/types';
import { type ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';
import { MaxSizeBasedOnMimetypeValidator } from '@common/src/validators/max-size-based-on-mimetype.validator';

export class FilesValidatorInterceptor
  implements NestInterceptor, OnModuleInit
{
  private systemSettingsService!: SystemSettingsServiceClient;

  constructor(
    private readonly configService: ConfigService,
    @Inject(SYSTEM_SETTINGS_SERVICE_NAME)
    private readonly systemSettingsClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.systemSettingsService =
      this.systemSettingsClient.getService<SystemSettingsServiceClient>(
        SYSTEM_SETTINGS_SERVICE_NAME,
      );
  }

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const files = req.files as Array<Express.Multer.File>;
    const file = req.file as Express.Multer.File;

    const { settings } = await firstValueFrom(
      this.systemSettingsService.findSettingsByPrefix(
        {
          prefixes: ['image', 'video', 'general'],
        },
        {} as Metadata,
      ),
    );

    await new ParseFilePipeBuilder()
      .addValidator(
        new FileTypeBasedOnMimetypeValidator({
          fileTypeRegexAsString:
            settings['general.allowed_file_type_regex']?.stringValue ||
            this.configService.getOrThrow<string>('DEFAULT_FILE_TYPE_REGEX')!,
        }),
      )
      .addValidator(
        new MaxSizeBasedOnMimetypeValidator({
          maxImageSizeInBytes:
            settings['image.max_size_in_bytes']?.intValue ||
            parseInt(
              this.configService.getOrThrow<string>(
                'DEFAULT_IMAGE_SIZE_IN_BYTES',
              )!,
            ),
          maxVideoSizeInBytes:
            settings['video.max_size_in_bytes']?.intValue ||
            parseInt(
              this.configService.getOrThrow<string>(
                'DEFAULT_VIDEO_SIZE_IN_BYTES',
              )!,
            ),
        }),
      )
      .build({
        exceptionFactory: (error) => {
          return new UnprocessableEntityException({
            code: SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED,
            message: error,
          });
        },
      })
      .transform(files || file);

    return next.handle();
  }
}
