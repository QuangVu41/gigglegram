import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  hashtagIds?: string[];

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  newHashtags?: string[];
}
