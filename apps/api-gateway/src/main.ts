import { NestFactory } from '@nestjs/core';
import { APIGatewayModule } from '@/src/api-gateway.module';
import { SystemWideHttpExceptionFilter } from '@repo/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(APIGatewayModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const apiGatewayUrl = configService.getOrThrow<string>('API_GATEWAY_URL');
  const defaultAPIDocsPath = configService.getOrThrow<string>(
    'DEFAULT_API_DOCS_PATH',
  );
  const defaultAPIDocsJsonPath = configService.getOrThrow<string>(
    'DEFAULT_API_DOCS_JSON_PATH',
  );

  app.setGlobalPrefix('api', {
    exclude: ['health', '/'],
  });
  app.enableCors();
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setVersion('1.0')
    .setTitle('Gigglegram API Gateway')
    .setDescription('Central Entry Point for Gigglegram Microservices')
    .addServer(apiGatewayUrl)
    .build();
  const DocumentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(defaultAPIDocsPath, app, DocumentFactory, {
    jsonDocumentUrl: defaultAPIDocsJsonPath,
    explorer: true,
    swaggerOptions: {
      urls: [
        {
          name: 'Main Gateway',
          url: `/${defaultAPIDocsJsonPath}`,
        },
        {
          name: 'Auth Service',
          url: `${apiGatewayUrl}/api/auth/${defaultAPIDocsJsonPath}`,
        },
      ],
    },
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
