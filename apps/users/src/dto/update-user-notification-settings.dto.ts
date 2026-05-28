import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserNotificationSettingsDto {
  @IsBoolean()
  @IsOptional()
  likesNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  commentsNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  newFollowersNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  mentionsNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  messagesNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  videoCallsNotifications?: boolean;
}
