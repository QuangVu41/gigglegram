import { IsArray, IsString } from 'class-validator';

export class DeleteManyLocationsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
