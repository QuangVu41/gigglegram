import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateGroupChatDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsArray()
  memberIds: string[];

  @IsString()
  @IsNotEmpty()
  groupName: string;
}
