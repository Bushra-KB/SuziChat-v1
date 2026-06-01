import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChatAttachmentInput,
  deriveMessageKind,
  messageAttachmentSelect,
  sanitizeChatAttachments,
} from '../uploads/attachment-input';

const peerSelect = {
  id: true,
  username: true,
  displayName: true,
  country: true,
  avatarUrl: true,
} as const;

const directMessageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  attachments: { select: messageAttachmentSelect },
  sender: { select: peerSelect },
  recipient: { select: { id: true } },
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
    const [messages, states] = await Promise.all([
      this.prisma.directMessage.findMany({
        where: {
          OR: [{ senderId: userId }, { recipientId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: peerSelect },
          recipient: { select: peerSelect },
        },
      }),
      this.prisma.directConversationState.findMany({
        where: { userId },
        select: { peerId: true, clearedAt: true },
      }),
    ]);

    const clearedByPeer = new Map(
      states.map((state) => [state.peerId, state.clearedAt]),
    );

    const seen = new Set<string>();
    const threads: Array<{
      peer: (typeof messages)[0]['sender'];
      lastMessage: {
        id: string;
        kind: (typeof messages)[0]['kind'];
        body: string;
        createdAt: Date;
        senderId: string;
      };
    }> = [];

    for (const m of messages) {
      const peer = m.senderId === userId ? m.recipient : m.sender;
      const clearedAt = clearedByPeer.get(peer.id);
      if (clearedAt && m.createdAt <= clearedAt) {
        continue;
      }
      if (seen.has(peer.id)) {
        continue;
      }
      seen.add(peer.id);
      threads.push({
        peer,
        lastMessage: {
          id: m.id,
          kind: m.kind,
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

    const state = await this.prisma.directConversationState.findUnique({
      where: { userId_peerId: { userId, peerId } },
      select: { clearedAt: true },
    });

    return this.prisma.directMessage.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, recipientId: peerId },
              { senderId: peerId, recipientId: userId },
            ],
          },
          ...(state ? [{ createdAt: { gt: state.clearedAt } }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: directMessageSelect,
    });
  }

  async sendMessage(
    userId: string,
    peerId: string,
    body: string,
    attachments?: ChatAttachmentInput[],
  ) {
    await this.getPeer(userId, peerId);
    const trimmedBody = body.trim();
    const safeAttachments = sanitizeChatAttachments(attachments);
    if (!trimmedBody && safeAttachments.length === 0) {
      throw new BadRequestException(
        'A message needs text or at least one attachment',
      );
    }

    return this.prisma.directMessage.create({
      data: {
        senderId: userId,
        recipientId: peerId,
        body: trimmedBody,
        kind: deriveMessageKind(trimmedBody, safeAttachments),
        attachments: safeAttachments.length
          ? { create: safeAttachments }
          : undefined,
      },
      select: directMessageSelect,
    });
  }

  async updateMessage(userId: string, messageId: string, body: string) {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      throw new BadRequestException('Message body is required');
    }

    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit messages you sent');
    }

    return this.prisma.directMessage.update({
      where: { id: messageId },
      data: { body: trimmedBody },
      select: directMessageSelect,
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, recipientId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete messages you sent');
    }

    await this.prisma.directMessage.delete({ where: { id: messageId } });
    return message;
  }

  async removeConversation(userId: string, peerId: string) {
    await this.getPeer(userId, peerId);

    const state = await this.prisma.directConversationState.upsert({
      where: { userId_peerId: { userId, peerId } },
      update: { clearedAt: new Date() },
      create: { userId, peerId },
      select: { peerId: true, clearedAt: true },
    });

    return state;
  }
}
