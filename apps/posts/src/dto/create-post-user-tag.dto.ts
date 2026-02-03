import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePostUserTagDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  xPosition: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  yPosition: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  mediaDisplayOrder: number;
}
