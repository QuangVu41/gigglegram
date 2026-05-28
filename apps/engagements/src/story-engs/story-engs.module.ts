import { Module } from '@nestjs/common';
import { StoryEngsService } from '@/src/story-engs/story-engs.service';
import { StoryEngsController } from '@/src/story-engs/story-engs.controller';
import { ModerationModule } from '@repo/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ENGAGEMENTS_CLIENT_ID, KAFKA_SERVICE_NAME } from '@repo/types';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
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
  controllers: [StoryEngsController],
  providers: [StoryEngsService],
})
export class StoryEngsModule {}
