import { Module } from '@nestjs/common';
import { PostEngsController } from '@/src/post-engs/post-engs.controller';
import { PostEngsService } from '@/src/post-engs/post-engs.service';
import { UploadModule } from '@repo/common';

@Module({
  imports: [UploadModule],
  controllers: [PostEngsController],
  providers: [PostEngsService],
})
export class PostEngsModule {}
