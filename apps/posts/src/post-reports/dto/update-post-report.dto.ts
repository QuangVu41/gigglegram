import {
  postReportsActionTakenEnum,
  postReportsStatusEnum,
} from '@repo/database';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePostReportDto {
  @IsOptional()
  @IsEnum(postReportsStatusEnum.enumValues)
  status?: (typeof postReportsStatusEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  reviewerNotes?: string;

  @IsOptional()
  @IsEnum(postReportsActionTakenEnum.enumValues)
  actionTaken?: (typeof postReportsActionTakenEnum.enumValues)[number];
}
