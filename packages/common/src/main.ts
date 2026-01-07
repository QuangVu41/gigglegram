import { NestFactory } from '@nestjs/core';
import { CommonModule } from '@common/src/common.module';

async function bootstrap() {
  const app = await NestFactory.create(CommonModule);
  return app;
}
export const commonModule = bootstrap();
