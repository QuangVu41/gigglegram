import { NestFactory } from '@nestjs/core';
import { CommonModule } from '@common/src/common.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CommonModule);
  return app;
}
export const bootstrapCommonModule = bootstrap;
