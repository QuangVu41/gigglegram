import {
  userPrivacySettingsWhoCanCommentEnum,
  userPrivacySettingsWhoCanMentionEnum,
  userPrivacySettingsWhoCanMessageEnum,
  userPrivacySettingsWhoCanTagEnum,
} from '@repo/database';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateUserPrivacySettingsDto {
  @IsOptional()
  @IsBoolean()
  accountPrivate?: boolean;

  @IsOptional()
  @IsEnum(userPrivacySettingsWhoCanCommentEnum.enumValues)
  whoCanComment?: (typeof userPrivacySettingsWhoCanCommentEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(userPrivacySettingsWhoCanTagEnum.enumValues)
  whoCanTag?: (typeof userPrivacySettingsWhoCanTagEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(userPrivacySettingsWhoCanMentionEnum.enumValues)
  whoCanMention?: (typeof userPrivacySettingsWhoCanMentionEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(userPrivacySettingsWhoCanMessageEnum.enumValues)
  whoCanMessage?: (typeof userPrivacySettingsWhoCanMessageEnum.enumValues)[number];

  @IsOptional()
  @IsBoolean()
  hideActivityStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  hideLikesCount?: boolean;
}
