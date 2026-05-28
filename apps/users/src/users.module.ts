import { Module } from '@nestjs/common';
import { UsersController } from '@/src/users.controller';
import { UsersService } from '@/src/users.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';
import { UsersRepository } from '@/src/users.repository';
import { UserNotificationSettingsRepository } from '@/src/user-notification-settings.repository';
import { UserPrivacySettingsRepository } from '@/src/user-privacy-settings.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  KAFKA_SERVICE_NAME,
  SYSTEM_SETTINGS_PACKAGE_NAME,
  SYSTEM_SETTINGS_SERVICE_NAME,
  USERS_CLIENT_ID,
} from '@repo/types';
import { join } from 'path';
import { TransformResponseInterceptor, UploadModule } from '@repo/common';
import { UsersSyncService } from '@/src/users-sync.service';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';

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
              clientId: USERS_CLIENT_ID,
              brokers: [
                configService.getOrThrow<string>('KAFKA_BROKER_LISTENER'),
              ],
            },
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
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UploadModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    UserNotificationSettingsRepository,
    UserPrivacySettingsRepository,
    UsersSyncService,

    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class UsersModule {}
