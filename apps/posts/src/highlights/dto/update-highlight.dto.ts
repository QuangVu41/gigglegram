import { PartialType } from '@nestjs/swagger';
import { CreateHighlightDto } from '@/src/highlights/dto/create-highlight.dto';

export class UpdateHighlightDto extends PartialType(CreateHighlightDto) {}
