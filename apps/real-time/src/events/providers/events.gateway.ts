import { DATABASE_CONNECTION, schema } from '@repo/database';
import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  JOIN_ROOM_EVENT,
  AuthenticatedSessionResponse,
  POST_VIEW_EVENT,
  STORY_VIEW_EVENT,
  KAFKA_SERVICE_NAME,
  POSTS_TOPIC_POST_VIEWED,
  PostViewedEvent,
  POSTS_TOPIC_STORY_VIEWED,
  StoryViewedEvent,
  POSTS_TOPIC_REEL_WATCHED_5S,
  ReelWatched5sEvent,
} from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Socket, Server } from 'socket.io';
import { eq } from 'drizzle-orm';
import { ClientKafka } from '@nestjs/microservices';

@WebSocketGateway({
  cors: {
    origin: [process.env.WEB_URL!],
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public readonly server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(KAFKA_SERVICE_NAME)
    private readonly kafkaClient: ClientKafka,
  ) {}

  async handleConnection(socket: Socket) {
    const session = socket.handshake.auth
      .session as AuthenticatedSessionResponse;

    if (!session || !session.user) {
      this.logger.warn('Unauthenticated socket connection attempt.');
      socket.disconnect();
      return;
    }

    await socket.join(`user-${session.user.id}`);
  }

  async handleDisconnect(socket: Socket) {
    const session = socket.handshake.auth
      .session as AuthenticatedSessionResponse;

    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    if (!session || !session.user) {
      return;
    }

    await this.db
      .update(schema.users)
      .set({
        lastActiveAt: new Date(),
      })
      .where(eq(schema.users.id, session.user.id));
  }

  @SubscribeMessage(JOIN_ROOM_EVENT)
  async handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() socket: Socket,
  ) {
    const session = socket.handshake.auth
      .session as AuthenticatedSessionResponse;

    if (!session || !session.user) {
      return;
    }
    await socket.join(room);

    this.logger.log(`Socket ${socket.id} joined room ${room}.`);

    return { success: true };
  }

  @SubscribeMessage(POST_VIEW_EVENT)
  async handlePostView(
    @MessageBody() data: { postId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const session = socket.handshake.auth
      .session as AuthenticatedSessionResponse;

    if (!session || !session.user) {
      return;
    }

    this.kafkaClient.emit(POSTS_TOPIC_POST_VIEWED, {
      postId: data.postId,
      userId: session.user.id,
    } as PostViewedEvent);

    return { success: true };
  }

  @SubscribeMessage(STORY_VIEW_EVENT)
  async handleStoryView(
    @MessageBody() data: { storyId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const session = socket.handshake.auth
      .session as AuthenticatedSessionResponse;

    if (!session || !session.user) {
      return;
    }

    this.kafkaClient.emit(POSTS_TOPIC_STORY_VIEWED, {
      storyId: data.storyId,
      userId: session.user.id,
    } as StoryViewedEvent);

    return { success: true };
  }

  @SubscribeMessage('reel_watched_5s')
  async handleReelWatched5s(
    @MessageBody() data: { reelId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const session = socket.handshake.auth
      .session as AuthenticatedSessionResponse;

    if (!session || !session.user) {
      return;
    }

    this.kafkaClient.emit(POSTS_TOPIC_REEL_WATCHED_5S, {
      reelId: data.reelId,
      userId: session.user.id,
    } as ReelWatched5sEvent);

    return { success: true };
  }
}
