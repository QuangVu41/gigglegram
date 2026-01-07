import { FileValidator } from '@nestjs/common';
import { SystemWideErrorCodes, SystemWideErrorMessages } from '@repo/types';

interface MaxSizeBasedOnMimetypeValidatorOptions {
  maxImageSizeInBytes: number;
  maxVideoSizeInBytes: number;
}

export class MaxSizeBasedOnMimetypeValidator extends FileValidator<MaxSizeBasedOnMimetypeValidatorOptions> {
  constructor(
    protected readonly validationOptions: MaxSizeBasedOnMimetypeValidatorOptions,
  ) {
    super(validationOptions);
  }

  isValid(file: Express.Multer.File): boolean {
    const { maxImageSizeInBytes, maxVideoSizeInBytes } = this.validationOptions;

    if (file.mimetype.startsWith('image/')) {
      return file.size <= maxImageSizeInBytes;
    } else if (file.mimetype.startsWith('video/')) {
      return file.size <= maxVideoSizeInBytes;
    }
    return false;
  }

  buildErrorMessage(file: Express.Multer.File): string {
    const { maxImageSizeInBytes, maxVideoSizeInBytes } = this.validationOptions;

    const errorMessage =
      SystemWideErrorMessages[
        SystemWideErrorCodes.UPLOAD_MAX_FILE_SIZE_EXCEEDED
      ];

    if (file.mimetype.startsWith('image/')) {
      return typeof errorMessage === 'function'
        ? errorMessage(file.size, maxImageSizeInBytes)
        : errorMessage;
    } else if (file.mimetype.startsWith('video/')) {
      return typeof errorMessage === 'function'
        ? errorMessage(file.size, maxVideoSizeInBytes)
        : errorMessage;
    }

    return SystemWideErrorMessages[
      SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE
    ] as string;
  }
}
