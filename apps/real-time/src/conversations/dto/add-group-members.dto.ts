import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddGroupMembersDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsArray()
  newMemberIds: string[];

  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
