import { IsArray, IsString } from 'class-validator';

export class DeleteManyHighlightsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
