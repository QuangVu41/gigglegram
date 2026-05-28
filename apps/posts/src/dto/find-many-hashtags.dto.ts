import { FindManyQueryDto } from '@repo/types';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindManyHashtagsDto extends FindManyQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  endDate?: Date;
}
