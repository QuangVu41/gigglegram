import { Module } from '@nestjs/common';
import { EmailModule } from '@common/src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    EmailModule,
  ],
})
export class CommonModule {}
