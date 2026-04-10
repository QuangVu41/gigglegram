import { OmitType } from '@nestjs/swagger';
import { CreatePostDto } from '@/src/dto/create-post.dto';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePostDto extends OmitType(CreatePostDto, [
  'audioId',
] as const) {
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
