import { Module } from '@nestjs/common';
import { PostsController } from '@/src/posts.controller';
import { PostsService } from '@/src/posts.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';
import {
  PermGuard,
  TransformResponseInterceptor,
  UploadModule,
} from '@repo/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  POSTS_CLIENT_ID,
  KAFKA_SERVICE_NAME,
  SYSTEM_SETTINGS_PACKAGE_NAME,
  SYSTEM_SETTINGS_SERVICE_NAME,
} from '@repo/types';
import { join } from 'path';
import { PostsRepository } from '@repo/database';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { StoriesModule } from '@/src/stories/stories.module';
import { CollectionsModule } from '@/src/collections/collections.module';
import { PostReportsModule } from '@/src/post-reports/post-reports.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PostsSyncService } from '@/src/posts-sync.service';
import { LocationsModule } from '@/src/locations/localtions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: POSTS_CLIENT_ID,
              brokers: [
                configService.getOrThrow<string>('KAFKA_BROKER_LISTENER'),
              ],
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: SYSTEM_SETTINGS_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: SYSTEM_SETTINGS_PACKAGE_NAME,
            protoPath: join(
              process.cwd(),
              '../../packages/types/src/proto/system-settings/system-settings.proto',
            ),
            url: configService.getOrThrow<string>('SYSTEM_SETTINGS_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: AUTH_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE_NAME,
            protoPath: join(
              process.cwd(),
              '../../packages/types/src/proto/auth/auth.proto',
            ),
            url: configService.getOrThrow<string>('AUTH_SERVICE_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UploadModule,
    StoriesModule,
    CollectionsModule,
    PostReportsModule,
    LocationsModule,
  ],
  controllers: [PostsController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: PermGuard,
    },
    PostsService,
    PostsRepository,
    PostsSyncService,
  ],
})
export class PostsModule {}
