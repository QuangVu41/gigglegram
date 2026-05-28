import { FindManyQueryDto } from '@repo/types';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';

export class FindManyAudioDto extends FindManyQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isOriginal?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isTrending?: boolean;
}
