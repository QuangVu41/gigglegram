import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LocationsService } from '@/src/locations/locations.service';
import { FindManyLocationsDto } from '@/src/locations/dto/find-many-locations.dto';
import { CreateLocationDto } from '@/src/locations/dto/create-location.dto';
import { UpdateLocationDto } from '@/src/locations/dto/update-location.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findManyLocations(@Query() findManyLocationsDto: FindManyLocationsDto) {
    return this.locationsService.findManyLocations(findManyLocationsDto);
  }

  @Post()
  async createLocation(createLocationDto: CreateLocationDto) {
    return this.locationsService.createLocation(createLocationDto);
  }

  @Get('{:locationId}')
  async findLocationById(@Param('locationId') locationId: string) {
    return this.locationsService.findLocationById(locationId);
  }

  @Patch('{:locationId}')
  async updateLocation(
    @Param('locationId') locationId: string,
    updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationsService.updateLocation(locationId, updateLocationDto);
  }

  @Delete('{:locationId}')
  async deleteLocation(@Param('locationId') locationId: string) {
    return this.locationsService.deleteLocation(locationId);
  }
}
