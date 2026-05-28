import { IsArray, IsString } from 'class-validator';

export class DeleteManyStoriesDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
