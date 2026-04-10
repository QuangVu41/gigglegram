import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConversationsService } from '@/src/conversations/conversations.service';
import { SendMessageDto } from '@/src/conversations/dto/send-message.dto';
import { CurrentUser } from '@repo/common';
import { users } from '@repo/database';
import { CreateGroupChatDto } from '@/src/conversations/dto/create-group-chat.dto';
import { FindManyQueryDto } from '@repo/types';
import { AddGroupMembersDto } from '@/src/conversations/dto/add-group-members.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('{:conversationId}')
  async findConversationMessages(
    @Query() findManyQueryDto: FindManyQueryDto,
    @Param('conversationId') converationId: string,
    user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.findConversationMessages(
      findManyQueryDto,
      converationId,
      user,
    );
  }

  @Get()
  async findUserConversations(
    @Query() findManyQueryDto: FindManyQueryDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.findUserConversations(
      findManyQueryDto,
      user,
    );
  }

  @Post('add-group-members')
  async addGroupMembers(
    @Body() addGroupMembersDto: AddGroupMembersDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.addGroupMembers(addGroupMembersDto, user);
  }

  @Post('send-message')
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.sendMessage(sendMessageDto, user);
  }

  @Post('create-group-chat')
  async createGroupChat(
    @Body() createGroupChatDto: CreateGroupChatDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.createGroupChat(createGroupChatDto, user);
  }

  @Delete('leave-group/{:conversationId}')
  async leaveGroupChat(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.leaveGroupChat(conversationId, user);
  }

  @Delete('delete-message/{:messageId}')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.deleteMessage(messageId, user);
  }

  @Delete('remove-group-members')
  async removeGroupMembers(
    @Body() removeGroupMembersDto: AddGroupMembersDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.removeGroupMembers(
      removeGroupMembersDto,
      user,
    );
  }

  @Patch('mute/{:conversationId}')
  async muteConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.muteConversation(conversationId, user);
  }
}
