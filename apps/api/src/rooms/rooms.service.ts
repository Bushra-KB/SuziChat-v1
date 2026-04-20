import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

const senderSelect = {
  id: true,
  username: true,
  displayName: true,
} as const;

const DEFAULT_ROOMS: Array<{
  slug: string;
  name: string;
  description: string;
  category: string;
  privacy: string;
}> = [
  {
    slug: 'general-chat',
    name: 'General Chat',
    description:
      'Warm open room for friendly conversations and community check-ins.',
    category: 'Social',
    privacy: 'Public',
  },
  {
    slug: 'music-lounge',
    name: 'Music Lounge',
    description:
      'Share playlists, compare headphones, and post your current mood track.',
    category: 'Music',
    privacy: 'Public',
  },
  {
    slug: 'late-night-chat',
    name: 'Late Night Chat',
    description: 'Adults-only conversations with a slower, more intimate pace.',
    category: 'Dating',
    privacy: 'Public',
  },
  {
    slug: 'movie-nights',
    name: 'Movie Nights',
    description:
      'Watchlist swaps, room rewatches, and scene-by-scene reactions.',
    category: 'Media',
    privacy: 'Friends',
  },
];

@Injectable()
export class RoomsService implements OnModuleInit {
  private readonly log = new Logger(RoomsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureSeedRooms();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P1001') {
          this.log.warn(
            'Database unreachable; skipped default room seed. Start PostgreSQL and restart the API (see repo docker compose or DATABASE_URL).',
          );
          return;
        }
        if (err.message.includes('does not exist')) {
          this.log.warn(
            'Database schema not applied (missing tables); skipped default room seed. Run: DATABASE_URL="<same as API>" pnpm db:push',
          );
          return;
        }
      }
      this.log.error('Default room seed failed', err instanceof Error ? err.stack : err);
    }
  }

  async ensureSeedRooms() {
    const owner = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!owner) {
      return;
    }

    for (const room of DEFAULT_ROOMS) {
      await this.prisma.room.upsert({
        where: { slug: room.slug },
        create: {
          slug: room.slug,
          name: room.name,
          description: room.description,
          category: room.category,
          privacy: room.privacy,
          ownerId: owner.id,
        },
        update: {
          name: room.name,
          description: room.description,
          category: room.category,
          privacy: room.privacy,
        },
      });
    }
  }

  async listRooms() {
    return this.prisma.room.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: { id: true, username: true, displayName: true },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  async getRoomBySlug(slug: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: { id: true, username: true, displayName: true },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async listMessages(roomSlug: string, take = 80) {
    const room = await this.prisma.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const messages = await this.prisma.roomMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: senderSelect },
      },
    });

    return messages.reverse();
  }

  private slugifyRoomName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  async createRoom(ownerId: string, dto: CreateRoomDto) {
    const name = dto.name.trim();
    const slug = (dto.slug?.trim() || this.slugifyRoomName(name)).toLowerCase();

    if (!slug) {
      throw new BadRequestException('Room slug is required');
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });

    if (!owner) {
      throw new UnauthorizedException();
    }

    const exists = await this.prisma.room.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('Room slug already exists');
    }

    return this.prisma.room.create({
      data: {
        ownerId,
        slug,
        name,
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || 'Social',
        privacy: dto.privacy ?? 'Public',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: { id: true, username: true, displayName: true },
        },
        _count: { select: { messages: true } },
      },
    });
  }

  async updateRoom(slug: string, userId: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.ownerId !== userId) {
      throw new ForbiddenException('Only room owner can edit this room');
    }

    return this.prisma.room.update({
      where: { slug },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        privacy: dto.privacy,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: { id: true, username: true, displayName: true },
        },
        _count: { select: { messages: true } },
      },
    });
  }

  async postMessage(roomSlug: string, senderId: string, body: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.prisma.roomMessage.create({
      data: {
        roomId: room.id,
        senderId,
        body: body.trim(),
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: senderSelect },
      },
    });
  }
}
