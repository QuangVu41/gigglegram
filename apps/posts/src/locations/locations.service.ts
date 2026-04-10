import { Injectable } from '@nestjs/common';
import { LocationsRepository } from '@/src/locations/locations.repository';
import { CreateLocationDto } from '@/src/locations/dto/create-location.dto';
import { UpdateLocationDto } from '@/src/locations/dto/update-location.dto';
import { FindManyLocationsDto } from '@/src/locations/dto/find-many-locations.dto';
import { and, eq } from 'drizzle-orm';
import { locations } from '@repo/database';
import { createTSQuery } from '@repo/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class LocationsService {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async findManyLocations(findManyLocationsDto: FindManyLocationsDto) {
    const { keyword } = findManyLocationsDto;

    return this.locationsRepository.findMany(
      {
        where: keyword
          ? sql`${createTSQuery<typeof locations>(['name', 'city', 'country'], keyword)}`
          : undefined,
      },
      findManyLocationsDto,
    );
  }

  async findLocationById(locationId: string) {
    return this.locationsRepository.findFirst({
      where: eq(locations.id, locationId),
    });
  }

  async createLocation(createLocationDto: CreateLocationDto) {
    const { name, city, country, latitude, longitude } = createLocationDto;

    return this.locationsRepository.create({
      name,
      city,
      country,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
  }

  async updateLocation(
    locationId: string,
    updateLocationDto: UpdateLocationDto,
  ) {
    const { name, city, country, latitude, longitude } = updateLocationDto;

    return this.locationsRepository.update(locationId, {
      name,
      city,
      country,
      latitude: latitude?.toString(),
      longitude: longitude?.toString(),
    });
  }

  async deleteLocation(locationId: string) {
    return this.locationsRepository.delete(locationId);
  }
}
