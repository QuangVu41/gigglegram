import {
  postReportsActionTakenEnum,
  postReportsStatusEnum,
  reportReasonsCategoryEnum,
} from '@repo/database';
import { FindManyQueryDto } from '@repo/types';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class FindManyPostReportsDto extends FindManyQueryDto {
  @IsOptional()
  @IsEnum(reportReasonsCategoryEnum.enumValues, { each: true })
  @IsArray()
  categories?: (typeof reportReasonsCategoryEnum.enumValues)[number][];

  @IsOptional()
  @IsString()
  reasonId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsEnum(postReportsStatusEnum.enumValues)
  status?: (typeof postReportsStatusEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(postReportsActionTakenEnum.enumValues)
  actionTaken?: (typeof postReportsActionTakenEnum.enumValues)[number];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reviewedFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reviewedTo?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resolvedFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resolvedTo?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reportedFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reportedTo?: Date;
}
