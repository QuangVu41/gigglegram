import { reportReasonsCategoryEnum } from '@repo/database';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReportReasonDto {
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  @IsEnum(reportReasonsCategoryEnum.enumValues)
  category: (typeof reportReasonsCategoryEnum.enumValues)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
