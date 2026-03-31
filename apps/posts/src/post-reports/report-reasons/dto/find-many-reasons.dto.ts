import { reportReasonsCategoryEnum } from '@repo/database';
import { FindManyQueryDto } from '@repo/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindManyReasonsDto extends FindManyQueryDto {
  @IsEnum(reportReasonsCategoryEnum.enumValues)
  @IsOptional()
  category?: (typeof reportReasonsCategoryEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  reasonCode?: string;
}
