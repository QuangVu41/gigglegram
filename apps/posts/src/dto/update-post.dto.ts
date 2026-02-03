import { OmitType } from '@nestjs/swagger';
import { CreatePostDto } from '@/src/dto/create-post.dto';

export class UpdatePostDto extends OmitType(CreatePostDto, [
  'audioId',
  'millisecondsToExtractThumbnail',
  'audioOmitted',
] as const) {}
