import { FindManyQueryDto } from '@repo/types';
import { IsNotEmpty, IsString } from 'class-validator';

export class FindManyPostsByHashtagDto extends FindManyQueryDto {
  @IsString()
  @IsNotEmpty()
  hashtag: string;
}
