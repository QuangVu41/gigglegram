import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsRepository } from '@/src/conversations/conversations.repository';
import { eq, or } from 'drizzle-orm';
import {
  conversationParticipants,
  conversations,
  conversationsTypeEnum,
  DATABASE_CONNECTION,
  db,
  followers,
  followersStatusEnum,
  messages,
  messagesTypeEnum,
  schema,
  userPrivacySettingsWhoCanMessageEnum,
  users,
} from '@repo/database';
import { SendMessageDto } from '@/src/conversations/dto/send-message.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { EventsGateway } from '@/src/events/providers/events.gateway';
import {
  FindManyQueryDto,
  NEW_CONVERSATION_EVENT,
  NEW_MESSAGE_EVENT,
  SystemWideErrorCodes,
} from '@repo/types';
import { and } from 'drizzle-orm';
import { CreateGroupChatDto } from '@/src/conversations/dto/create-group-chat.dto';
import { sql } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { asc } from 'drizzle-orm';
import { AddGroupMembersDto } from '@/src/conversations/dto/add-group-members.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventsGateWay: EventsGateway,
  ) {}

  async findConversationMessages(
    findManyQueryDto: FindManyQueryDto,
    conversationId: string,
    user: typeof users.$inferSelect,
  ) {
    // Verify user is a participant
    const participant = await this.db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, user.id),
      ),
    });

    if (!participant) {
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Not a participant of this conversation',
      });
    }

    const replyMsg = alias(messages, 'replyMsg');

    const userMessages = await this.db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        mediaUrl: messages.mediaUrl,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
        replyToMessageId: messages.replyToMessageId,

        // Sender info
        sender: {
          id: users.id,
          username: users.username,
          name: users.name,
          image: users.image,
        },

        // Reply info
        replyToMessage: {
          id: replyMsg.id,
          content: replyMsg.content,
          messageType: replyMsg.type,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .leftJoin(replyMsg, eq(messages.replyToMessageId, replyMsg.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(findManyQueryDto.limit)
      .offset((findManyQueryDto.page - 1) * findManyQueryDto.limit);

    await this.db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, user.id),
        ),
      );

    return userMessages;
  }

  async findUserConversations(
    findManyQueryDto: FindManyQueryDto,
    user: typeof users.$inferSelect,
  ) {
    const userConversations = await this.db
      .select({
        id: conversations.id,
        type: conversations.type,
        name: conversations.name,
        imageUrl: conversations.imageUrl,
        lastMessageAt: conversations.lastMessageAt,

        lastReadAt: conversationParticipants.lastReadAt,
        notificationsEnnaled: conversationParticipants.notificationsEnabled,

        lastMessage: {
          id: messages.id,
          content: messages.content,
          type: messages.type,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        },
      })
      .from(conversationParticipants)
      .innerJoin(
        conversations,
        eq(conversationParticipants.conversationId, conversations.id),
      )
      .leftJoin(
        messages,
        and(
          eq(messages.conversationId, conversations.id),
          eq(
            messages.createdAt,
            db
              .select({ maxCreatedAt: sql<Date>`MAX(${messages.createdAt})` })
              .from(messages)
              .where(eq(messages.conversationId, conversations.id)),
          ),
        ),
      )
      .where(eq(conversationParticipants.userId, user.id))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(findManyQueryDto.limit)
      .offset((findManyQueryDto.page - 1) * findManyQueryDto.limit);

    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        if (conv.type === conversationsTypeEnum.enumValues[0]) {
          const [otherParticipant] = await this.db
            .select({
              id: users.id,
              username: users.username,
              name: users.name,
              image: users.image,
              lastActiveAt: users.lastActiveAt,
            })
            .from(conversationParticipants)
            .innerJoin(users, eq(conversationParticipants.userId, users.id))
            .where(
              and(
                eq(conversationParticipants.conversationId, conv.id),
                ne(conversationParticipants.userId, user.id),
              ),
            );

          return {
            ...conv,
            otherParticipant,
            displayName: otherParticipant?.name,
            displayImage: otherParticipant?.image,
          };
        }

        return {
          ...conv,
          displayName: conv.name,
          displayImage: conv.imageUrl,
        };
      }),
    );

    return enriched;
  }

  async addGroupMembers(
    addGroupMembersDto: AddGroupMembersDto,
    user: typeof users.$inferSelect,
  ) {
    // Verify adder is admin
    const admin = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(
          conversationParticipants.conversationId,
          addGroupMembersDto.conversationId,
        ),
        eq(conversationParticipants.userId, user.id),
        eq(conversationParticipants.isAdmin, true),
      ),
      with: {
        conversation: true,
      },
    });

    if (!admin) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_ALLOWED,
        description: 'Only group admins can add new members.',
      });
    }

    const result = await Promise.all(
      addGroupMembersDto.newMemberIds.map(async (memberId) => {
        return this.db.transaction(async (tx) => {
          const newParticipant = await tx
            .insert(conversationParticipants)
            .values({
              conversationId: addGroupMembersDto.conversationId,
              userId: memberId,
              isAdmin: false,
              joinedAt: new Date(),
            })
            .returning();

          const newUser = await tx.query.users.findFirst({
            where: eq(users.id, memberId),
            columns: {
              name: true,
            },
          });

          if (newUser) {
            // System message
            const newMessage = await tx
              .insert(messages)
              .values({
                conversationId: addGroupMembersDto.conversationId,
                senderId: user.id,
                content: `added ${newUser.name} to the group`,
                type: messagesTypeEnum.enumValues[4], // system
                createdAt: new Date(),
              })
              .returning();

            this.eventsGateWay.server
              .to(`user-${memberId}`)
              .emit(NEW_CONVERSATION_EVENT, admin.conversation);

            this.eventsGateWay.server
              .to(`conversation-${addGroupMembersDto.conversationId}`)
              .emit(NEW_MESSAGE_EVENT, newMessage);
          }

          return newParticipant;
        });
      }),
    );

    return result;
  }

  async removeGroupMembers(
    removeGroupMembersDto: AddGroupMembersDto,
    user: typeof users.$inferSelect,
  ) {
    // Verify adder is admin
    const admin = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(
          conversationParticipants.conversationId,
          removeGroupMembersDto.conversationId,
        ),
        eq(conversationParticipants.userId, user.id),
        eq(conversationParticipants.isAdmin, true),
      ),
      with: {
        conversation: true,
      },
    });

    if (!admin) {
      throw new BadRequestException({
        code: SystemWideErrorCodes.NOT_ALLOWED,
        description: 'Only group admins can remove members.',
      });
    }

    const result = await Promise.all(
      removeGroupMembersDto.newMemberIds.map(async (memberId) => {
        return this.db.transaction(async (tx) => {
          const deleted = await tx
            .delete(conversationParticipants)
            .where(
              and(
                eq(
                  conversationParticipants.conversationId,
                  removeGroupMembersDto.conversationId,
                ),
                eq(conversationParticipants.userId, memberId),
              ),
            )
            .returning();

          const removedUser = await tx.query.users.findFirst({
            where: eq(users.id, memberId),
            columns: {
              name: true,
            },
          });

          if (removedUser) {
            // System message
            const newMessage = await tx.insert(messages).values({
              conversationId: removeGroupMembersDto.conversationId,
              senderId: user.id,
              content: `removed ${removedUser.name} from the group`,
              type: messagesTypeEnum.enumValues[4], // system
              createdAt: new Date(),
            });

            this.eventsGateWay.server
              .to(`conversation-${removeGroupMembersDto.conversationId}`)
              .emit(NEW_MESSAGE_EVENT, newMessage);
          }

          return deleted;
        });
      }),
    );

    return result;
  }

  async leaveGroupChat(
    conversationId: string,
    user: typeof users.$inferSelect,
  ) {
    const exisitngConv = await this.conversationsRepository.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!exisitngConv)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Conversation not found.',
      });

    const result = await this.db.transaction(async (tx) => {
      if (exisitngConv.type === conversationsTypeEnum.enumValues[1]) {
        //group chat
        const [result] = await tx
          .delete(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, user.id),
            ),
          )
          .returning();

        const newMessage = await tx.insert(messages).values({
          conversationId: conversationId,
          senderId: user.id,
          content: `${user.name} left the group.`,
          type: messagesTypeEnum.enumValues[4], // system
        });

        this.eventsGateWay.server
          .to(`conversation-${conversationId}`)
          .emit(NEW_MESSAGE_EVENT, newMessage);

        return result;
      }
    });

    return result;
  }

  async createGroupChat(
    createGroupChatDto: CreateGroupChatDto,
    user: typeof users.$inferSelect,
  ) {
    const conversation = await this.db.transaction(async (tx) => {
      try {
        const [conversation] = await tx
          .insert(conversations)
          .values({
            type: conversationsTypeEnum.enumValues[1],
            name: createGroupChatDto.groupName,
            lastMessageAt: new Date(),
          })
          .returning();

        if (conversation) {
          const participants: (typeof conversationParticipants.$inferInsert)[] =
            [
              {
                conversationId: conversation.id,
                userId: user.id,
                isAdmin: true,
              },
              ...createGroupChatDto.memberIds.map((memberId) => ({
                conversationId: conversation.id,
                userId: memberId,
                isAdmin: false,
              })),
            ];

          await tx.insert(conversationParticipants).values(participants);

          createGroupChatDto.memberIds.forEach((memberId) => {
            this.eventsGateWay.server
              .to(`user-${memberId}`)
              .emit(NEW_CONVERSATION_EVENT, conversation);
          });

          return conversation;
        }
      } catch (error) {
        this.logger.error('Failed to create group chat.', error);
        throw new InternalServerErrorException({
          code: SystemWideErrorCodes.CREATION_FAILED,
          description: 'Failed to create group chat.',
        });
      }
    });

    return conversation;
  }

  async sendMessage(
    sendMessageDto: SendMessageDto,
    user: typeof users.$inferSelect,
  ) {
    const receiverUser = await this.db.query.users.findFirst({
      where: eq(users.id, sendMessageDto.receiverId),
      with: {
        userNotificationSetting: true,
        userPrivacySetting: true,
        followers: {
          where: and(
            eq(followers.followerId, user.id),
            eq(followers.status, followersStatusEnum.enumValues[1]),
          ),
        },
      },
    });

    if (
      receiverUser &&
      receiverUser.userPrivacySetting?.whoCanMessage ===
        userPrivacySettingsWhoCanMessageEnum.enumValues[2]
    )
      throw new MethodNotAllowedException({
        code: SystemWideErrorCodes.CREATION_FAILED,
        description: 'You cannot send message to this user.',
      });

    if (
      receiverUser &&
      receiverUser.userPrivacySetting?.whoCanMessage ===
        userPrivacySettingsWhoCanMessageEnum.enumValues[1]
    )
      if (receiverUser.followers.length === 0)
        throw new MethodNotAllowedException({
          code: SystemWideErrorCodes.CREATION_FAILED,
          description: 'You cannot send message to this user.',
        });

    const conversation = await this.getOrCreateConversation(
      user.id,
      sendMessageDto.receiverId,
    );

    const [message] = await this.db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderId: user.id,
        content: sendMessageDto.content,
        type: sendMessageDto.type,
        replyToMessageId: sendMessageDto.replyToMessageId,
      })
      .returning();

    const [_, receiverParticipant] = await Promise.all([
      this.db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversation.id))
        .returning(),
      this.db.query.conversationParticipants.findFirst({
        where: and(
          eq(conversationParticipants.conversationId, conversation.id),
          eq(conversationParticipants.userId, sendMessageDto.receiverId),
        ),
        with: {
          user: {
            with: {
              userNotificationSetting: true,
              userPrivacySetting: true,
              followers: {
                where: eq(followers.followerId, user.id),
              },
            },
          },
        },
      }),
    ]);

    if (
      receiverParticipant &&
      receiverParticipant.user.userNotificationSetting?.messagesNotifications
    )
      if (receiverParticipant.notificationsEnabled)
        this.eventsGateWay.server
          .to(`user-${sendMessageDto.receiverId}`)
          .emit(NEW_MESSAGE_EVENT, message);

    this.eventsGateWay.server
      .to(`conversation-${conversation.id}`)
      .emit(NEW_MESSAGE_EVENT, message);

    return message;
  }

  async muteConversation(
    conversationId: string,
    user: typeof users.$inferSelect,
  ) {
    const result = await this.db
      .update(conversationParticipants)
      .set({ notificationsEnabled: false })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, user.id),
        ),
      )
      .returning();

    return result;
  }

  async deleteMessage(messageId: string, user: typeof users.$inferSelect) {
    const existingMessage = await this.db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!existingMessage)
      throw new NotFoundException({
        code: SystemWideErrorCodes.NOT_FOUND,
        description: 'Message not found.',
      });

    if (existingMessage.senderId !== user.id)
      throw new MethodNotAllowedException({
        code: SystemWideErrorCodes.NOT_ALLOWED,
        description: 'You can only delete your own messages.',
      });

    const [result] = await this.db
      .update(messages)
      .set({ isDeleted: true })
      .where(eq(messages.id, messageId))
      .returning();

    this.eventsGateWay.server
      .to(`conversation-${existingMessage.conversationId}`)
      .emit(NEW_MESSAGE_EVENT, result);

    return result;
  }

  public async getOrCreateConversation(user1Id: string, user2Id: string) {
    // Util function
    const existingConversation = await this.conversationsRepository.findMany({
      where: eq(conversations.type, conversationsTypeEnum.enumValues[0]),
      with: {
        participants: {
          where: or(
            eq(conversationParticipants.userId, user1Id),
            eq(conversationParticipants.userId, user2Id),
          ),
        },
      },
    });

    if (
      existingConversation.length === 1 &&
      existingConversation[0]?.participants.length === 2
    ) {
      return existingConversation[0];
    }

    const createdConversation = await this.conversationsRepository.create({
      type: conversationsTypeEnum.enumValues[0],
      lastMessageAt: new Date(),
    });

    await db.insert(conversationParticipants).values([
      {
        conversationId: createdConversation.id,
        userId: user1Id,
      },
      {
        conversationId: createdConversation.id,
        userId: user2Id,
      },
    ]);

    return createdConversation;
  }
}
