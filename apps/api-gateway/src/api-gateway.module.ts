import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthProxyMiddleware } from '@/src/middlewares/auth/auth-proxy.middleware';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_PACKAGE_NAME, AUTH_SERVICE_NAME } from '@repo/types';
import { join } from 'path';
import { AuthProtectMiddleware } from '@/src/middlewares/auth/auth-protect.middleware';
import { PostsProxyMiddleware } from '@/src/middlewares/posts/posts-proxy.middleware';

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
              '../../packages/types/src/proto/auth.proto',
            ),
            url: configService.get<string>('AUTH_SERVICE_GRPC_URL'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [],
  providers: [],
})
export class APIGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthProxyMiddleware).forRoutes('/auth');
    consumer
      .apply(AuthProtectMiddleware, PostsProxyMiddleware)
      .forRoutes('/posts');
  }
}
