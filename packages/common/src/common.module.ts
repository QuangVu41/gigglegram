import { Module } from '@nestjs/common';
import { EmailModule } from '@common/src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { UploadModule } from '@common/src/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EmailModule,
    UploadModule,
  ],
})
export class CommonModule {}
