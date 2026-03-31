import { Module } from '@nestjs/common';
import { LikesController } from '@/src/likes/likes.controller';
import { LikesService } from '@/src/likes/likes.service';

@Module({
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
