import { IsArray, IsString } from 'class-validator';

export class DeleteManySettingsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
