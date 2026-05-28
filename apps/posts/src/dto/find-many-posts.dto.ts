import { FindManyQueryDto } from '@repo/types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FindManyPostsDto extends FindManyQueryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  audioId?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isReel?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  endDate?: Date;
}
