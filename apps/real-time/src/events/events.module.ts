import { Global, Module } from '@nestjs/common';
import { EventsGateway } from '@/src/events/providers/events.gateway';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  KAFKA_SERVICE_NAME,
  REAL_TIME_CLIENT_ID,
} from '@repo/types';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
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
      {
        name: KAFKA_SERVICE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: REAL_TIME_CLIENT_ID,
              brokers: [
                configService.getOrThrow<string>('KAFKA_BROKER_LISTENER'),
              ],
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
