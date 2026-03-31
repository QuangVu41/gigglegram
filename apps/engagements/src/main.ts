import { NestFactory } from '@nestjs/core';
import { EngagementsModule } from '@/src/engagements.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ENGAGEMENTS_SERVICE_GROUP_ID } from '@repo/types';

async function bootstrap() {
  const app = await NestFactory.create(EngagementsModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [configService.getOrThrow<string>('KAFKA_BROKER_LISTENER')],
      },
      consumer: {
        groupId: ENGAGEMENTS_SERVICE_GROUP_ID,
      },
    },
  });

  await app.startAllMicroservices();
  await app.init();
}
bootstrap();
