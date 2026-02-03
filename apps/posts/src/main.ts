import { NestFactory } from '@nestjs/core';
import { PostsModule } from './posts.module';
import { ValidationPipe } from '@nestjs/common';
import { SystemWideHttpExceptionFilter } from '@repo/common';

async function bootstrap() {
  const app = await NestFactory.create(PostsModule);
  app.setGlobalPrefix('/api/posts');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SystemWideHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3003);
}
bootstrap();
