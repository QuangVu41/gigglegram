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
  ENGAGEMENTS_POSTS_CLIENT_ID,
  ENGAGEMENTS_SERVICE_NAME,
  SYSTEM_SETTINGS_PACKAGE_NAME,
  SYSTEM_SETTINGS_SERVICE_NAME,
} from '@repo/types';
import { join } from 'path';
import { PostsRepository } from '@/src/posts.repository';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { StoriesModule } from '@/src/stories/stories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UploadModule,
    StoriesModule,
    ClientsModule.registerAsync([
      {
        name: ENGAGEMENTS_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: ENGAGEMENTS_POSTS_CLIENT_ID,
              brokers: [
                configService.getOrThrow<string>('ENGAGEMENTS_BROKER_LISTENER'),
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
  ],
})
export class PostsModule {}
