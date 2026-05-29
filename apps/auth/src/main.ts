import { NestFactory } from '@nestjs/core';
import { AuthenticationModule } from '@/src/authentication.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AUTH_PACKAGE_NAME } from '@repo/types';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SystemWideHttpExceptionFilter } from '@repo/common';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthenticationModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const apiGatewayUrl = configService.getOrThrow<string>('API_GATEWAY_URL');
  const defaultAPIDocsPath = configService.getOrThrow<string>(
    'DEFAULT_API_DOCS_PATH',
  );
  const defaultAPIDocsJsonPath = configService.getOrThrow<string>(
    'DEFAULT_API_DOCS_JSON_PATH',
  );

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());
  app.setGlobalPrefix('/api/authentication');
  app.enableCors();
  const authServiceGrpcUrl = configService.getOrThrow<string>('AUTH_SERVICE_GRPC_URL');
  const authServiceGrpcPort = authServiceGrpcUrl.split(':').pop();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: AUTH_PACKAGE_NAME,
      protoPath: join(
        process.cwd(),
        '../../packages/types/src/proto/auth/auth.proto',
      ),
      url: `0.0.0.0:${authServiceGrpcPort}`,
    },
  });

  const swaggerConfig = new DocumentBuilder()
    .setVersion('1.0')
    .setTitle('Gigglegram Auth Service')
    .setDescription('Authentication Service for Gigglegram')
    .addServer(`${apiGatewayUrl}/api/auth`)
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`/api/auth/${defaultAPIDocsPath}`, app, documentFactory, {
    jsonDocumentUrl: `/api/auth/${defaultAPIDocsJsonPath}`,
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
