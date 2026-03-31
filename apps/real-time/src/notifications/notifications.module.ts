import { Module } from '@nestjs/common';
import { NotificationsController } from '@/src/notifications/notifications.controller';
import { NotificationsService } from '@/src/notifications/notifications.service';
import { NotificationsRepository } from '@/src/notifications/notifications.repository';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
