import { Module } from '@nestjs/common';
import { ConversationsController } from '@/src/conversations/conversations.controller';
import { ConversationsService } from '@/src/conversations/conversations.service';
import { ConversationsRepository } from '@/src/conversations/conversations.repository';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository],
})
export class ConversationsModule {}
