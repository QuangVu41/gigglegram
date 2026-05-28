import { Module } from '@nestjs/common';
import { ConversationsController } from '@/src/conversations/conversations.controller';
import { ConversationsService } from '@/src/conversations/conversations.service';
import { ConversationsRepository } from '@/src/conversations/conversations.repository';
import { UploadModule } from '@repo/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  SYSTEM_SETTINGS_PACKAGE_NAME,
  SYSTEM_SETTINGS_SERVICE_NAME,
} from '@repo/types';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UploadModule,
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
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository],
})
export class ConversationsModule {}
