import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@/src/lib/auth';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule, TransformResponseInterceptor } from '@repo/common';
import { SignUpHook } from '@/src/hooks/signup.hook';
import { AuthenticationController } from '@/src/authentication.controller';
import { AuthenticationService } from '@/src/authentication.service';
import { DatabaseModule } from '@repo/database';
import { APP_INTERCEPTOR } from '@nestjs/core';
import express from 'express';
import { AdminModule } from '@/src/admin/admin.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_SERVICE_NAME, POSTS_CLIENT_ID } from '@repo/types';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    AuthModule.forRoot({ auth, disableBodyParser: false }),
    ClientsModule.registerAsync([
      {
        name: KAFKA_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: POSTS_CLIENT_ID,
              brokers: [
                configService.getOrThrow<string>('KAFKA_BROKER_LISTENER'),
              ],
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    EmailModule,
    DatabaseModule,
    AdminModule,
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
