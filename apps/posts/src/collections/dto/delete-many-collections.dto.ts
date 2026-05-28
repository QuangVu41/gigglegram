import { IsArray, IsString } from 'class-validator';

export class DeleteManyCollectionsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
