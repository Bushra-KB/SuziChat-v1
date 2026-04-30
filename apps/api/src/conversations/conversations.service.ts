import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const peerSelect = {
  id: true,
  username: true,
  displayName: true,
  country: true,
  avatarUrl: true,
} as const;

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPeer(userId: string, peerId: string) {
    if (userId === peerId) {
      throw new ForbiddenException('Cannot message yourself');
    }

    const peer = await this.prisma.user.findUnique({
      where: { id: peerId },
      select: peerSelect,
    });

    if (!peer) {
      throw new NotFoundException('User not found');
    }

    return peer;
  }

  async listThreads(userId: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: peerSelect },
        recipient: { select: peerSelect },
      },
    });

    const seen = new Set<string>();
    const threads: Array<{
      peer: (typeof messages)[0]['sender'];
      lastMessage: { id: string; body: string; createdAt: Date; senderId: string };
    }> = [];

    for (const m of messages) {
      const peer = m.senderId === userId ? m.recipient : m.sender;
      if (seen.has(peer.id)) {
        continue;
      }
      seen.add(peer.id);
      threads.push({
        peer,
        lastMessage: {
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          senderId: m.senderId,
        },
      });
    }

    return threads;
  }

  async listMessages(userId: string, peerId: string) {
    await this.getPeer(userId, peerId);

    return this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: peerId },
          { senderId: peerId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: peerSelect },
        recipient: { select: { id: true } },
      },
    });
  }

  async sendMessage(userId: string, peerId: string, body: string) {
    await this.getPeer(userId, peerId);

    return this.prisma.directMessage.create({
      data: {
        senderId: userId,
        recipientId: peerId,
        body: body.trim(),
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: peerSelect },
        recipient: { select: { id: true } },
      },
    });
  }
}
