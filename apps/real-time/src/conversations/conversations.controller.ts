import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ConversationsService } from '@/src/conversations/conversations.service';
import { SendMessageDto } from '@/src/conversations/dto/send-message.dto';
import { CurrentUser, FilesValidatorInterceptor } from '@repo/common';
import { users } from '@repo/database';
import { CreateGroupChatDto } from '@/src/conversations/dto/create-group-chat.dto';
import { FindManyQueryDto } from '@repo/types';
import { AddGroupMembersDto } from '@/src/conversations/dto/add-group-members.dto';

import { StartPrivateConversationDto } from '@/src/conversations/dto/start-private-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('{:conversationId}')
  async findConversationMessages(
    @Query() findManyQueryDto: FindManyQueryDto,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.findConversationMessages(
      findManyQueryDto,
      conversationId,
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

  @Post('private')
  async startPrivateConversation(
    @Body() startPrivateConversationDto: StartPrivateConversationDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.getOrCreateConversation(
      user.id,
      startPrivateConversationDto.targetUserId,
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
  @UseInterceptors(
    FilesValidatorInterceptor.setOptions({ fileIsRequired: false }),
  )
  @UseInterceptors(FilesInterceptor('media'))
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user: typeof users.$inferSelect,
    @UploadedFiles() media?: Express.Multer.File[],
  ) {
    return this.conversationsService.sendMessage(sendMessageDto, user, media);
  }

  @Post('create-group-chat')
  async createGroupChat(
    @Body() createGroupChatDto: CreateGroupChatDto,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.createGroupChat(createGroupChatDto, user);
  }

  @Delete('{:conversationId}')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.deleteConversation(conversationId, user);
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

  @Patch('toggle-mute/{:conversationId}')
  async toggleMuteConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: typeof users.$inferSelect,
  ) {
    return this.conversationsService.toggleMuteConversation(
      conversationId,
      user,
    );
  }
}
