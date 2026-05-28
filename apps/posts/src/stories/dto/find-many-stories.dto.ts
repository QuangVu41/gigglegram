import { FindManyQueryDto } from '@repo/types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class FindManyStoriesDto extends FindManyQueryDto {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isExpired?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  endDate?: Date;
}
