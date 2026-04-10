import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class VideoMetadataDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  millisecondsToExtractThumbnail?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  audioOmitted?: boolean;
}
