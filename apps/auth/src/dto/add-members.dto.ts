import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddMembersDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @IsArray()
  userIds: string[];
}
