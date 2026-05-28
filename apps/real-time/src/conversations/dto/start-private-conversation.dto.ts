import { IsNotEmpty, IsString } from 'class-validator';

export class StartPrivateConversationDto {
  @IsNotEmpty()
  @IsString()
  targetUserId: string;
}
