import {
  contentReportsActionTakenEnum,
  contentReportsStatusEnum,
  reportReasonsCategoryEnum,
} from '@repo/database';
import { FindManyQueryDto } from '@repo/types';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class FindManyContentReportsDto extends FindManyQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
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
  @IsEnum(contentReportsStatusEnum.enumValues)
  status?: (typeof contentReportsStatusEnum.enumValues)[number];

  @IsOptional()
  @IsEnum(contentReportsActionTakenEnum.enumValues)
  actionTaken?: (typeof contentReportsActionTakenEnum.enumValues)[number];

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
