import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { userPrivacySettingsWhoCanCommentEnum } from '@repo/database';

export class UpdateUserPrivacySettingsDto {
  @IsOptional()
  @IsBoolean()
  accountPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  hideActivityStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  hideLikesCount?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(userPrivacySettingsWhoCanCommentEnum.enumValues)
  whoCanComment?: (typeof userPrivacySettingsWhoCanCommentEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  @IsIn(userPrivacySettingsWhoCanCommentEnum.enumValues)
  whoCanTag?: (typeof userPrivacySettingsWhoCanCommentEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  @IsIn(userPrivacySettingsWhoCanCommentEnum.enumValues)
  whoCanMention?: (typeof userPrivacySettingsWhoCanCommentEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  @IsIn(userPrivacySettingsWhoCanCommentEnum.enumValues)
  whoCanMessage?: (typeof userPrivacySettingsWhoCanCommentEnum.enumValues)[number];
}
