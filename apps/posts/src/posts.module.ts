import { Module } from '@nestjs/common';
import { PostsController } from '@/src/posts.controller';
import { PostsService } from '@/src/posts.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';
import { UploadModule } from '@repo/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UploadModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
