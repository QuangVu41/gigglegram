import { Module } from '@nestjs/common';
import { UploadService } from '@common/src/upload/upload.service';

@Module({
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
