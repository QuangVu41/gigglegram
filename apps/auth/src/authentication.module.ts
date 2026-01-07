import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@/src/lib/auth';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '@repo/common';
import { SignUpHook } from '@/src/hooks/signup.hook';
import { AuthenticationController } from '@/src/authentication.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule.forRoot({ auth }),
    EmailModule,
  ],
  controllers: [AuthenticationController],
  providers: [SignUpHook],
})
export class AuthenticationModule {}
