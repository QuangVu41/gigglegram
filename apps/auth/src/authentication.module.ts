import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@/src/lib/auth';
import { ConfigModule } from '@nestjs/config';
import { EmailModule, TransformResponseInterceptor } from '@repo/common';
import { SignUpHook } from '@/src/hooks/signup.hook';
import { AuthenticationController } from '@/src/authentication.controller';
import { AuthenticationService } from '@/src/authentication.service';
import { DatabaseModule } from '@repo/database';
import { APP_INTERCEPTOR } from '@nestjs/core';
import express from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule.forRoot({ auth, disableBodyParser: false }),
    EmailModule,
    DatabaseModule,
  ],
  controllers: [AuthenticationController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    AuthenticationService,
    SignUpHook,
  ],
})
export class AuthenticationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(express.json()).forRoutes(AuthenticationController);
  }
}
