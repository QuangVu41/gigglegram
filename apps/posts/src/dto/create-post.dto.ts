import { plainToClass, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreatePostUserTagDto } from '@/src/dto/create-post-user-tag.dto';
import { VideoMetadataDto } from '@/src/dto/video-metadata.dto';

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

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  collaboratorIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return plainToClass(VideoMetadataDto, JSON.parse(value));
      } catch {
        return plainToClass(VideoMetadataDto, value);
      }
    }
    return plainToClass(VideoMetadataDto, value);
  })
  videoMetadata?: VideoMetadataDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return plainToClass(CreatePostUserTagDto, JSON.parse(value));
      } catch {
        return plainToClass(CreatePostUserTagDto, value);
      }
    }
    return plainToClass(CreatePostUserTagDto, value);
  })
  taggedUsers?: CreatePostUserTagDto[];
}
