import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

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
}
