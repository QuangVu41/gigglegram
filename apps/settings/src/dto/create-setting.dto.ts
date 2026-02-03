import { systemSettingsTypeEnum } from '@repo/database';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsEnum(systemSettingsTypeEnum.enumValues)
  @IsNotEmpty()
  type: (typeof systemSettingsTypeEnum.enumValues)[number];

  @IsString()
  @IsOptional()
  description: string;

  @IsBoolean()
  @IsOptional()
  isPublic: boolean;
}
