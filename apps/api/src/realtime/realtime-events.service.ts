import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { APP_REALTIME_CHANNEL } from './realtime-channels';

@Injectable()
export class RealtimeEventsService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitRoom(roomSlug: string, event: string, payload: unknown) {
    this.server?.to(`room:${roomSlug}`).emit(event, payload);
  }

  emitToChannel(channel: string, event: string, payload: unknown) {
    this.server?.to(channel).emit(event, payload);
  }

  emitToApp(event: string, payload: unknown) {
    this.server?.to(APP_REALTIME_CHANNEL).emit(event, payload);
  }
}
