import { contentReportsType } from '@repo/database';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateContentReportDto {
  @IsString()
  @IsOptional()
  reportedUserId?: string;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  reasonId: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsEnum(contentReportsType.enumValues)
  type: (typeof contentReportsType.enumValues)[number];
}
