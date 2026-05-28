import { Module } from '@nestjs/common';
import { StoriesController } from '@/src/stories/stories.controller';
import { StoriesService } from '@/src/stories/stories.service';
import { StoriesRepository } from '@/src/stories/stories.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  KAFKA_SERVICE_NAME,
  POSTS_CLIENT_ID,
  SYSTEM_SETTINGS_PACKAGE_NAME,
  SYSTEM_SETTINGS_SERVICE_NAME,
} from '@repo/types';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.registerAsync([
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
    ]),
  ],
  controllers: [StoriesController],
  providers: [StoriesService, StoriesRepository],
})
export class StoriesModule {}
