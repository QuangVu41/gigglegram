import { Inject, Injectable } from '@nestjs/common';
import { LocationsRepository } from '@/src/locations/locations.repository';
import { CreateLocationDto } from '@/src/locations/dto/create-location.dto';
import { UpdateLocationDto } from '@/src/locations/dto/update-location.dto';
import { FindManyLocationsDto } from '@/src/locations/dto/find-many-locations.dto';
import { and, eq, count, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION, locations, schema } from '@repo/database';
import { createTSQuery } from '@repo/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class LocationsService {
  constructor(
    private readonly locationsRepository: LocationsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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

  async getLocationsStats() {
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(locations);

    const [citiesResult] = await this.db
      .select({ count: sql<number>`count(distinct ${locations.city})` })
      .from(locations);

    const [countriesResult] = await this.db
      .select({ count: sql<number>`count(distinct ${locations.country})` })
      .from(locations);

    return {
      totalLocations: totalResult?.count || 0,
      uniqueCities: citiesResult?.count || 0,
      uniqueCountries: countriesResult?.count || 0,
    };
  }

  async deleteManyLocations(ids: string[]) {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.db
      .delete(locations)
      .where(inArray(locations.id, ids))
      .returning();
  }
}
