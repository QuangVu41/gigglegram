import { FindManyQueryDto } from '@repo/types';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class FilterSettingsDto extends FindManyQueryDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  prefixes?: string[];
}
