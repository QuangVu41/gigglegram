import { Module } from '@nestjs/common';
import { LocationsController } from '@/src/locations/locations.controller';
import { LocationsService } from '@/src/locations/locations.service';
import { LocationsRepository } from '@/src/locations/locations.repository';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, LocationsRepository],
})
export class LocationsModule {}
