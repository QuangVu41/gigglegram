import {
  contentReportsActionTakenEnum,
  contentReportsStatusEnum,
} from '@repo/database';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateContentReportDto {
  @IsOptional()
  @IsEnum(contentReportsStatusEnum.enumValues)
  status?: (typeof contentReportsStatusEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  reviewerNotes?: string;

  @IsOptional()
  @IsEnum(contentReportsActionTakenEnum.enumValues)
  actionTaken?: (typeof contentReportsActionTakenEnum.enumValues)[number];
}
