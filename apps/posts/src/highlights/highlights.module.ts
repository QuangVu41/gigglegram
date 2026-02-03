import { Module } from '@nestjs/common';
import { HighlightsController } from '@/src/highlights/highlights.controller';
import { HighlightsService } from '@/src/highlights/highlights.service';
import { HighlightsRepository } from '@/src/highlights/highlights.repository';

@Module({
  controllers: [HighlightsController],
  providers: [HighlightsService, HighlightsRepository],
})
export class HighlightsModule {}
