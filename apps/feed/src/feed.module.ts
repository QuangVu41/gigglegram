import { Module } from '@nestjs/common';
import { FeedController } from '@/src/feed.controller';
import { FeedService } from '@/src/feed.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { DatabaseModule, PostsRepository } from '@repo/database';
import { join } from 'path';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformResponseInterceptor } from '@repo/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        stores: [new KeyvRedis(configService.getOrThrow<string>('REDIS_HOST'))],
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
  ],
  controllers: [FeedController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    FeedService,
    PostsRepository,
  ],
})
export class FeedModule {}
