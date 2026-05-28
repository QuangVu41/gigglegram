import { Module } from '@nestjs/common';
import { PostEngsModule } from '@/src/post-engs/post-engs.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';
import { UserEngsModule } from '@/src/user-engs/user-engs.module';
import { StoryEngsModule } from '@/src/story-engs/story-engs.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    DatabaseModule,
    PostEngsModule,
    UserEngsModule,
    StoryEngsModule,
  ],
})
export class EngagementsModule {}
