import { Module } from '@nestjs/common';
import { LikesController } from '@/src/likes/likes.controller';
import { LikesService } from '@/src/likes/likes.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_SERVICE_NAME, POSTS_CLIENT_ID } from '@repo/types';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
