import { Module } from '@nestjs/common';
import { EmailModule } from '@common/src/email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), EmailModule],
})
export class CommonModule {}
