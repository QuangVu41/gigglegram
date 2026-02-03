import { Module } from '@nestjs/common';
import { PostEngsModule } from '@/src/post-engs/post-engs.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PostEngsModule,
  ],
})
export class EngagementsModule {}
