import { FileValidator, Logger } from '@nestjs/common';
import { SystemWideErrorCodes, SystemWideErrorMessages } from '@repo/types';

interface FileTypeBasedOnMimetypeValidatorOptions {
  fileTypeRegexAsString: string;
}

export class FileTypeBasedOnMimetypeValidator extends FileValidator<FileTypeBasedOnMimetypeValidatorOptions> {
  private readonly logger = new Logger(FileTypeBasedOnMimetypeValidator.name);

  constructor(
    protected readonly validationOptions: FileTypeBasedOnMimetypeValidatorOptions,
  ) {
    super(validationOptions);
  }

  isValid(file: Express.Multer.File): boolean {
    this.logger.log('[FileTypeBasedOnMimetypeValidator] Validating file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      regexString: this.validationOptions.fileTypeRegexAsString,
    });
    if (!file.mimetype) {
      this.logger.log(
        '[FileTypeBasedOnMimetypeValidator] Validation failed: missing mimetype',
      );
      return false;
    }
    const regexString = this.validationOptions.fileTypeRegexAsString;
    const regex = new RegExp(regexString);

    const result = regex.test(file.mimetype);
    console.log(
      '[FileTypeBasedOnMimetypeValidator] Validation result:',
      result,
    );
    return result;
  }

  buildErrorMessage(): string {
    return SystemWideErrorMessages[
      SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE
    ] as string;
  }
}
