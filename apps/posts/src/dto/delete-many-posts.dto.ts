import { IsArray, IsString } from 'class-validator';

export class DeleteManyPostsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
