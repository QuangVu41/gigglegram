import { IsNotEmpty, IsString } from 'class-validator';

export class SaveAudioTrackDto {
  @IsString()
  @IsNotEmpty()
  audioTrackId: string;
}
