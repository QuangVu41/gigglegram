import { NestFactory } from '@nestjs/core';
import { APIGatewayModule } from '@/src/api-gateway.module';
import { SystemWideHttpExceptionFilter } from '@repo/common';

async function bootstrap() {
  const app = await NestFactory.create(APIGatewayModule, { bodyParser: false });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
