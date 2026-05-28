import { FindManyQueryDto } from '@repo/types';
import { IsOptional, IsString } from 'class-validator';

export class FindManySavedCollectionsDto extends FindManyQueryDto {
  @IsOptional()
  @IsString()
  all?: string;
}
