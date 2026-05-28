import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsOptional()
  logo?: string;
}

export class UpdateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsOptional()
  logo?: string;
}

export class DeleteManyOrganizationsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids!: string[];
}

export class SaveOrganizationRoleDto {
  @IsObject()
  @IsNotEmpty()
  permission!: Record<string, string[]>;
}
