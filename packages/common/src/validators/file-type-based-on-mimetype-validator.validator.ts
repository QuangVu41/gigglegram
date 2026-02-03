import { FileValidator } from '@nestjs/common';
import { SystemWideErrorCodes, SystemWideErrorMessages } from '@repo/types';

interface FileTypeBasedOnMimetypeValidatorOptions {
  fileTypeRegexAsString: string;
}

export class FileTypeBasedOnMimetypeValidator extends FileValidator<FileTypeBasedOnMimetypeValidatorOptions> {
  constructor(
    protected readonly validationOptions: FileTypeBasedOnMimetypeValidatorOptions,
  ) {
    super(validationOptions);
  }

  isValid(file: Express.Multer.File): boolean {
    if (!file.mimetype) {
      return false;
    }
    const regexString = this.validationOptions.fileTypeRegexAsString;
    const regex = new RegExp(regexString);

    return regex.test(file.mimetype);
  }

  buildErrorMessage(): string {
    return SystemWideErrorMessages[
      SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE
    ] as string;
  }
}
