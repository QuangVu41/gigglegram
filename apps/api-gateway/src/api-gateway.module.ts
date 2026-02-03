import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    consumer.apply(AuthProxyMiddleware).forRoutes('/authentication');
    consumer
      .apply(AuthProtectMiddleware, PostsProxyMiddleware)
      .forRoutes('/posts');
    consumer
      .apply(AuthProtectMiddleware, SettingsProxyMiddleware)
      .forRoutes('/settings');
  }
}
