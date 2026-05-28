import { Module } from '@nestjs/common';
import { PostEngsController } from '@/src/post-engs/post-engs.controller';
import { PostEngsService } from '@/src/post-engs/post-engs.service';
import { UploadModule, ModerationModule } from '@repo/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ENGAGEMENTS_CLIENT_ID, KAFKA_SERVICE_NAME } from '@repo/types';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UploadModule,
    ModerationModule,
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: ENGAGEMENTS_CLIENT_ID,
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
  controllers: [PostEngsController],
  providers: [PostEngsService],
})
export class PostEngsModule {}
