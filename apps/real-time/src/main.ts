import { NestFactory } from '@nestjs/core';
import { RealTimeModule } from '@/src/real-time.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { REALTIME_SERVICE_GROUP_ID } from '@repo/types';
import { ValidationPipe } from '@nestjs/common';
import { SystemWideHttpExceptionFilter } from '@repo/common';

async function bootstrap() {
  const app = await NestFactory.create(RealTimeModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());
  app.setGlobalPrefix('/api/real-time', {
    exclude: ['health', '/'],
  });
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [configService.getOrThrow<string>('KAFKA_BROKER_LISTENER')],
      },
      consumer: {
        groupId: REALTIME_SERVICE_GROUP_ID,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3007);
}
bootstrap();
