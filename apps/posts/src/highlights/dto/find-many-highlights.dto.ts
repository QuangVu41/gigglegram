import { FindManyQueryDto } from '@repo/types';
import { IsOptional, IsString } from 'class-validator';

export class FindManyHighlightsDto extends FindManyQueryDto {
  @IsString()
  @IsOptional()
  userId?: string;
}
