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
import { JOIN_ROOM_EVENT, AuthenticatedSessionResponse } from '@repo/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Socket, Server } from 'socket.io';
import { eq } from 'drizzle-orm';

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
}
