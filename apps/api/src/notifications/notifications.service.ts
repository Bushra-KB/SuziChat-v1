import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RealtimeStateService } from '../realtime/realtime-state.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly realtimeState: RealtimeStateService,
  ) {}

  async list(userId: string, take = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        body: true,
        read: true,
        createdAt: true,
      },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const note = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });

    if (!note) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
      select: {
        id: true,
        read: true,
      },
    });
    this.realtimeEvents.emitToUser(userId, 'notifications:update', {
      reason: 'mark_read',
    });
    const state = await this.realtimeState.buildUserState(userId);
    this.realtimeEvents.emitToUser(userId, 'realtime:state', state);
    return updated;
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    this.realtimeEvents.emitToUser(userId, 'notifications:update', {
      reason: 'mark_all_read',
    });
    const state = await this.realtimeState.buildUserState(userId);
    this.realtimeEvents.emitToUser(userId, 'realtime:state', state);
    return { updated: result.count };
  }
}
