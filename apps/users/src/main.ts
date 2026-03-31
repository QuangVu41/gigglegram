import { NestFactory } from '@nestjs/core';
import { UsersModule } from '@/src/users.module';
import { ValidationPipe } from '@nestjs/common';
import { SystemWideHttpExceptionFilter } from '@repo/common';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  app.setGlobalPrefix('/api/users');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3006);
}
bootstrap();
