import { Module } from '@nestjs/common';
import { ContentReportsController } from '@/src/content-reports/content-reports.controller';
import { ContentReportsService } from '@/src/content-reports/content-reports.service';
import { ContentReportsRepository } from '@/src/content-reports/content-reports.repository';
import { ReportReasonsRepository } from '@/src/content-reports/report-reasons/report-reasons.repository';
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
  controllers: [ContentReportsController],
  providers: [
    ContentReportsService,
    ContentReportsRepository,
    ReportReasonsRepository,
  ],
})
export class ContentReportsModule {}
