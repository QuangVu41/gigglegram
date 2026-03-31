import { FindManyQueryDto } from '@repo/types';

export class FindManyLocationsDto extends FindManyQueryDto {
  country?: string;
  city?: string;
  name?: string;
}
