import { IsArray, IsString } from 'class-validator';

export class DeleteManyHashtagsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
