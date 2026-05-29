import { NestFactory } from '@nestjs/core';
import { SettingsModule } from '@/src/settings.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SYSTEM_SETTINGS_PACKAGE_NAME } from '@repo/types';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SystemWideHttpExceptionFilter } from '@repo/common';

async function bootstrap() {
  const app = await NestFactory.create(SettingsModule);
  app.setGlobalPrefix('/api/settings');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());

  const configService = app.get(ConfigService);
  const systemSettingsGrpcUrl = configService.getOrThrow<string>('SYSTEM_SETTINGS_GRPC_URL');
  const systemSettingsGrpcPort = systemSettingsGrpcUrl.split(':').pop();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: SYSTEM_SETTINGS_PACKAGE_NAME,
      protoPath: join(
        process.cwd(),
        '../../packages/types/src/proto/system-settings/system-settings.proto',
      ),
      url: `0.0.0.0:${systemSettingsGrpcPort}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3004);
}
bootstrap();
