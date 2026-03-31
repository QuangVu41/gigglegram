import { Module } from '@nestjs/common';
import { CollectionsController } from '@/src/collections/collections.controller';
import { CollectionsService } from '@/src/collections/collections.service';
import { CollectionsRepository } from '@/src/collections/collections.repository';

@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService, CollectionsRepository],
})
export class CollectionsModule {}
