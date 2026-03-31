import { Module } from '@nestjs/common';
import { AdminController } from '@/src/admin/admin.controller';
import { AdminService } from '@/src/admin/admin.service';
import { UploadModule } from '@repo/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_SERVICE_NAME, POSTS_CLIENT_ID } from '@repo/types';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UploadModule,
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
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
