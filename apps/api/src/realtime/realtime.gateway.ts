import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RoomsService } from '../rooms/rooms.service';

type AuthSocket = Socket & {
  data: {
    userId?: string;
  };
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: false,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly roomsService: RoomsService,
  ) {}

  private getToken(socket: Socket) {
    const authToken =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : null;
    if (authToken?.trim()) {
      return authToken.trim().replace(/^Bearer\s+/i, '');
    }

    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.trim()) {
      return header.trim().replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  private getUserId(socket: AuthSocket) {
    const userId = socket.data.userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    return userId;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private roomChannel(roomSlug: string) {
    return `room:${roomSlug}`;
  }

  async handleConnection(client: AuthSocket) {
    try {
      const token = this.getToken(client);
      if (!token) {
        client.emit('realtime:error', { message: 'Missing access token' });
        client.disconnect();
        return;
      }
      const payload = await this.authService.verifyAccessToken(token);
      client.data.userId = payload.sub;
      await client.join(this.userRoom(payload.sub));
    } catch {
      client.emit('realtime:error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  @SubscribeMessage('dm:join')
  async onDmJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { peerId?: string },
  ) {
    const userId = this.getUserId(client);
    const peerId = payload?.peerId?.trim();
    if (!peerId) {
      throw new WsException('peerId is required');
    }
    await this.conversationsService.getPeer(userId, peerId);
    return { ok: true };
  }

  @SubscribeMessage('dm:send')
  async onDmSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { peerId?: string; body?: string },
  ) {
    const userId = this.getUserId(client);
    const peerId = payload?.peerId?.trim();
    const body = payload?.body?.trim();
    if (!peerId || !body) {
      throw new WsException('peerId and body are required');
    }

    const message = await this.conversationsService.sendMessage(userId, peerId, body);
    this.server
      .to(this.userRoom(message.sender.id))
      .to(this.userRoom(message.recipient.id))
      .emit('dm:message', message);

    return { ok: true, message };
  }

  @SubscribeMessage('room:join')
  async onRoomJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string },
  ) {
    this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    if (!roomSlug) {
      throw new WsException('roomSlug is required');
    }
    await this.roomsService.getRoomBySlug(roomSlug);
    await client.join(this.roomChannel(roomSlug));
    return { ok: true };
  }

  @SubscribeMessage('room:send')
  async onRoomSend(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() payload: { roomSlug?: string; body?: string },
  ) {
    const userId = this.getUserId(client);
    const roomSlug = payload?.roomSlug?.trim();
    const body = payload?.body?.trim();
    if (!roomSlug || !body) {
      throw new WsException('roomSlug and body are required');
    }

    const message = await this.roomsService.postMessage(roomSlug, userId, body);
    this.server.to(this.roomChannel(roomSlug)).emit('room:message', {
      roomSlug,
      message,
    });

    return { ok: true, message };
  }
}
