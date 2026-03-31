import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString({ each: true })
  @IsOptional()
  @IsArray()
  savedPostIds?: string[];
}
