import { FindManyQueryDto } from '@repo/types';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class FindManySettingsDto extends FindManyQueryDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  prefixes?: string[];

  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  isPublic?: string | boolean;
}
