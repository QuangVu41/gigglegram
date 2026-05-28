import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BAAuthProxyMiddleware } from '@/src/middlewares/auth/ba-auth-proxy.middleware';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_PACKAGE_NAME, AUTH_SERVICE_NAME } from '@repo/types';
import { join } from 'path';
import { AuthProtectMiddleware } from '@/src/middlewares/auth/auth-protect.middleware';
import { PostsProxyMiddleware } from '@/src/middlewares/posts/posts-proxy.middleware';
import { APIGatewayController } from '@/src/api-gateway.controller';
import { SettingsProxyMiddleware } from '@/src/middlewares/settings/settings-proxy.middleware';
import { AuthProxyMiddleware } from '@/src/middlewares/auth/auth-proxy.middleware';
import { FeedProxyMiddleware } from '@/src/middlewares/feed/feed-proxy.middleware';
import { UsersProxyMiddleware } from '@/src/middlewares/users/users-proxy.middleware';
import { RealTimeProxyMiddleware } from '@/src/middlewares/real-time/real-time-proxy.middleware';

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
  ],
  controllers: [APIGatewayController],
  providers: [],
})
export class APIGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BAAuthProxyMiddleware).forRoutes('/auth');
    consumer
      .apply(AuthProtectMiddleware, AuthProxyMiddleware)
      .forRoutes('/authentication');
    consumer
      .apply(AuthProtectMiddleware, PostsProxyMiddleware)
      .forRoutes('/posts');
    consumer
      .apply(AuthProtectMiddleware, SettingsProxyMiddleware)
      .forRoutes('/settings');
    consumer
      .apply(AuthProtectMiddleware, FeedProxyMiddleware)
      .forRoutes('/feed');
    consumer
      .apply(AuthProtectMiddleware, UsersProxyMiddleware)
      .forRoutes('/users');
    consumer
      .apply(AuthProtectMiddleware, RealTimeProxyMiddleware)
      .forRoutes('/real-time');
  }
}
