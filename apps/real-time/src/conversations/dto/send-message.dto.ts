import { messagesTypeEnum } from '@repo/database';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(messagesTypeEnum.enumValues)
  @IsNotEmpty()
  type: (typeof messagesTypeEnum.enumValues)[number];

  @IsString()
  @IsNotEmpty()
  replyToMessageId?: string;
}
