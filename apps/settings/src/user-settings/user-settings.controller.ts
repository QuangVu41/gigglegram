import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserSettingsService } from '@/src/user-settings/user-settings.service';
import { UpdateUserPrivacySettingsDto } from '@/src/user-settings/dto/update-user-privacy-settings.dto';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';
import { UpdateUserNotificationSettingsDto } from '@/src/user-settings/dto/update-user-notification-settings.dto';

@Controller('users')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get('privacy-settings')
  async getUserPrivacySettings(@CurrentUser() user: typeof users.$inferSelect) {
    return this.userSettingsService.getUserPrivacySettings(user);
  }

  @Patch('privacy-settings')
  async updateUserPrivacySettings(
    @Body() updateUserPrivacySettingsDto: UpdateUserPrivacySettingsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.userSettingsService.updateUserPrivacySettings(
      updateUserPrivacySettingsDto,
      user,
    );
  }

  @Get('notification-settings')
  async getUserNotificationSettings(
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.userSettingsService.getUserNotificationSettings(user);
  }

  @Patch('notification-settings')
  async updateUserNotificationSettings(
    @Body()
    updateUserNotificationSettingsDto: UpdateUserNotificationSettingsDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.userSettingsService.updateUserNotificationSettings(
      updateUserNotificationSettingsDto,
      user,
    );
  }
}
