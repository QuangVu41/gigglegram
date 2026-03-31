import {
  DATABASE_CONNECTION,
  schema,
  userNotificationSettings,
  userPrivacySettings,
  users,
} from '@repo/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UpdateUserPrivacySettingsDto } from '@/src/user-settings/dto/update-user-privacy-settings.dto';
import { eq } from 'drizzle-orm';
import { SystemWideErrorCodes } from '@repo/types';
import { UpdateUserNotificationSettingsDto } from '@/src/user-settings/dto/update-user-notification-settings.dto';

@Injectable()
export class UserSettingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getUserPrivacySettings(user: typeof users.$inferSelect) {
    const [privacySettings] = await this.db
      .select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, user.id))
      .limit(1);

    if (!privacySettings)
      throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

    return privacySettings;
  }

  async updateUserPrivacySettings(
    updateUserPrivacySettingsDto: UpdateUserPrivacySettingsDto,
    user: typeof users.$inferSelect,
  ) {
    const existingSettings = await this.db.query.userPrivacySettings.findFirst({
      where: eq(userPrivacySettings.userId, user.id),
    });

    if (!existingSettings)
      throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

    if (
      Object.values(updateUserPrivacySettingsDto).some(
        (value) => value !== undefined,
      )
    ) {
      const [updatedSettings] = await this.db
        .update(userPrivacySettings)
        .set(updateUserPrivacySettingsDto)
        .where(eq(userPrivacySettings.userId, user.id))
        .returning();

      return updatedSettings;
    }
  }

  async getUserNotificationSettings(user: typeof users.$inferSelect) {
    const [notificationSettings] = await this.db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, user.id))
      .limit(1);

    if (!notificationSettings)
      throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

    return notificationSettings;
  }

  async updateUserNotificationSettings(
    updateUserNotificationSettingsDto: UpdateUserNotificationSettingsDto,
    user: typeof users.$inferSelect,
  ) {
    const existingSettings =
      await this.db.query.userNotificationSettings.findFirst({
        where: eq(userNotificationSettings.userId, user.id),
      });

    if (!existingSettings)
      throw new BadRequestException({ code: SystemWideErrorCodes.NOT_FOUND });

    if (
      Object.values(updateUserNotificationSettingsDto).some(
        (value) => value !== undefined,
      )
    ) {
      const [updatedSettings] = await this.db
        .update(userNotificationSettings)
        .set(updateUserNotificationSettingsDto)
        .where(eq(userNotificationSettings.userId, user.id))
        .returning();

      return updatedSettings;
    }
  }
}
