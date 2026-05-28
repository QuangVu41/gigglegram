import { IsArray, IsString } from 'class-validator';

export class DeleteManyAudioDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
