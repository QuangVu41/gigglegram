import { FindManyQueryDto } from '@repo/types';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindManyPostMediaDto extends FindManyQueryDto {
  @IsEnum(['pending', 'approved', 'flagged'])
  @IsOptional()
  moderationStatus?: 'pending' | 'approved' | 'flagged';

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  endDate?: Date;
}
