import { IsBoolean, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateAudioDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isOriginal?: boolean;

  @IsBoolean()
  @IsOptional()
  isTrending?: boolean;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
