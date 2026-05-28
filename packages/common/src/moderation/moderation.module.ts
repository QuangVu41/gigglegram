import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModerationService } from '@common/src/moderation/moderation.service';
import { DatabaseModule } from '@repo/database';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
