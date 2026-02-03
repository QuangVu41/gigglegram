import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class FindManyQueryDto {
  @IsOptional()
  @IsString({ each: true })
  ids: string[] = [];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sort: string = "createdAt,desc";
}
