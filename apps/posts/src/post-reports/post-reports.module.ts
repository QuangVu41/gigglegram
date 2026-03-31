import { Module } from '@nestjs/common';
import { PostReportsController } from '@/src/post-reports/post-reports.controller';
import { PostReportsService } from '@/src/post-reports/post-reports.service';
import { PostReportsRepository } from '@/src/post-reports/post-reports.repository';
import { ReportReasonsRepository } from '@/src/post-reports/report-reasons/report-reasons.repository';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_SERVICE_NAME, POSTS_CLIENT_ID } from '@repo/types';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
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
  controllers: [PostReportsController],
  providers: [
    PostReportsService,
    PostReportsRepository,
    ReportReasonsRepository,
  ],
})
export class PostReportsModule {}
