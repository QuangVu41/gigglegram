import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  likesNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  commentsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  newFollowersNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  messagesNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  videoCallsNotifications?: boolean;
}
