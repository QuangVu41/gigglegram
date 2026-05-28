import { Transform, Type } from 'class-transformer';
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
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  commentsDisabled?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
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
  @Type(() => VideoMetadataDto)
  videoMetadata?: VideoMetadataDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostUserTagDto)
  taggedUsers?: CreatePostUserTagDto[];
}
