import { NestFactory } from '@nestjs/core';
import { AuthenticationModule } from '@/src/authentication.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AUTH_PACKAGE_NAME } from '@repo/types';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AuthenticationModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: AUTH_PACKAGE_NAME,
      protoPath: join(
        process.cwd(),
        '../../packages/types/src/proto/auth.proto',
      ),
      url: configService.get<string>('AUTH_SERVICE_GRPC_URL'),
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
