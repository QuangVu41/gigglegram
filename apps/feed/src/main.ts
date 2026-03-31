import { NestFactory } from '@nestjs/core';
import { FeedModule } from '@/src/feed.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { FEED_SERVICE_GROUP_ID } from '@repo/types';
import { ValidationPipe } from '@nestjs/common';
import { SystemWideHttpExceptionFilter } from '@repo/common';

async function bootstrap() {
  const app = await NestFactory.create(FeedModule);
  app.setGlobalPrefix('/api/feed');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());

  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [configService.getOrThrow<string>('KAFKA_BROKER_LISTENER')],
      },
      consumer: {
        groupId: FEED_SERVICE_GROUP_ID,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
