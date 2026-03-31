import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTH_PACKAGE_NAME, AUTH_SERVICE_NAME } from '@repo/types';
import { join } from 'path';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatabaseModule } from '@repo/database';
import { NotificationsModule } from '@/src/notifications/notifications.module';
import { ConversationsModule } from '@/src/conversations/conversations.module';
import { CommentsModule } from '@/src/comments/comments.module';
import { ProtectMiddleware } from '@/src/middlewares/protect.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformResponseInterceptor } from '@repo/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE_NAME,
            protoPath: join(
              process.cwd(),
              '../../packages/types/src/proto/auth/auth.proto',
            ),
            url: configService.getOrThrow<string>('AUTH_SERVICE_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    EventsModule,
    DatabaseModule,
    NotificationsModule,
    ConversationsModule,
    CommentsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class RealTimeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProtectMiddleware).forRoutes('/*path');
  }
}
