import { OmitType } from '@nestjs/swagger';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePostDto extends OmitType(CreatePostDto, [
  'audioId',
] as const) {
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  sharesCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  viewsCount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  playsCount?: number;
}
