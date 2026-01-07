import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(2200)
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  audioId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  commentsDisabled?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  likesHidden?: boolean;

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  hashtagIds?: string[];

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  newHashtags?: string[];

  @IsOptional()
  @IsNumber()
  millisecondsToExtractThumbnail?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  audioOmitted?: boolean;
}
