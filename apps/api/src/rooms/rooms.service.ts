import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, RoomJoinRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

/** User fields exposed on messages, members, and room owners. */
const userPublicSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
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
const DEFAULT_ROOM_CATEGORIES = ['Social', 'Music', 'Sports', 'Chill', 'Dating', 'Media', 'Travel'];

type RoomListActorState = {
  isMember: boolean;
  hasPendingRequest: boolean;
  action: 'open' | 'join' | 'request' | 'requested' | 'blocked';
};

type RoomAccessState = {
  roomId: string;
  ownerId: string;
  privacy: string;
  isOwner: boolean;
  isMember: boolean;
  isBlocked: boolean;
  hasPendingRequest: boolean;
};

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
          imageUrl: null,
          category: room.category,
          privacy: room.privacy,
          ownerId: owner.id,
        },
        update: {
          name: room.name,
          description: room.description,
          imageUrl: null,
          category: room.category,
          privacy: room.privacy,
        },
      });
    }
  }

  async listCategories() {
    const grouped = await this.prisma.room.groupBy({
      by: ['category'],
    });
    const dbCategories = grouped
      .map((row) => row.category?.trim())
      .filter((row): row is string => Boolean(row));
    return [...new Set([...DEFAULT_ROOM_CATEGORIES, ...dbCategories])];
  }

  async listRooms() {
    return this.prisma.room.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: userPublicSelect,
        },
        _count: {
          select: {
            messages: true,
            memberships: true,
          },
        },
      },
    });
  }

  async listRoomsForUser(userId: string) {
    const rows = await this.prisma.room.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        category: true,
        privacy: true,
        createdAt: true,
        ownerId: true,
        owner: {
          select: userPublicSelect,
        },
        memberships: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
        joinRequests: {
          where: { userId, status: RoomJoinRequestStatus.PENDING },
          select: { id: true },
          take: 1,
        },
        bans: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: {
            messages: true,
            memberships: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const isMember = row.ownerId === userId || row.memberships.length > 0;
      const hasPendingRequest = row.joinRequests.length > 0;
      const isBlocked = row.bans.length > 0;
      const privacy = row.privacy.toLowerCase();
      const action: RoomListActorState['action'] = isBlocked
        ? 'blocked'
        : isMember
        ? 'open'
        : privacy === 'public'
          ? 'join'
          : hasPendingRequest
            ? 'requested'
            : 'request';
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        imageUrl: row.imageUrl,
        category: row.category,
        privacy: row.privacy,
        createdAt: row.createdAt,
        owner: row.owner,
        _count: row._count,
        actor: {
          isMember,
          hasPendingRequest,
          isBlocked,
          action,
        },
      };
    });
  }

  async cancelJoinRequest(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    if (access.isMember) {
      return { status: 'member' as const };
    }
    const deleted = await this.prisma.roomJoinRequest.deleteMany({
      where: {
        roomId: access.roomId,
        userId,
        status: RoomJoinRequestStatus.PENDING,
      },
    });
    return { status: deleted.count > 0 ? ('cancelled' as const) : ('none' as const) };
  }

  private async resolveAccessState(slug: string, userId: string): Promise<RoomAccessState> {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: {
        id: true,
        ownerId: true,
        privacy: true,
        memberships: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
        joinRequests: {
          where: { userId, status: RoomJoinRequestStatus.PENDING },
          select: { id: true },
          take: 1,
        },
        bans: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return {
      roomId: room.id,
      ownerId: room.ownerId,
      privacy: room.privacy,
      isOwner: room.ownerId === userId,
      isMember: room.ownerId === userId || room.memberships.length > 0,
      isBlocked: room.bans.length > 0,
      hasPendingRequest: room.joinRequests.length > 0,
    };
  }

  async getRoomAccess(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    const privacy = access.privacy.toLowerCase();
    const canOpen = !access.isBlocked && (privacy === 'public' || access.isMember);
    return {
      roomSlug: slug,
      isOwner: access.isOwner,
      isMember: access.isMember,
      isBlocked: access.isBlocked,
      hasPendingRequest: access.hasPendingRequest,
      canOpen,
      canPost: canOpen && access.isMember,
      privacy: access.privacy,
    };
  }

  async getRoomBySlug(slug: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: userPublicSelect,
        },
        _count: {
          select: {
            messages: true,
            memberships: true,
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
        sender: { select: userPublicSelect },
      },
    });

    return messages.reverse();
  }

  async listMessagesForUser(roomSlug: string, userId: string, take = 80) {
    const access = await this.resolveAccessState(roomSlug, userId);
    if (access.isBlocked) {
      throw new ForbiddenException('You are blocked from this room');
    }
    if (access.privacy.toLowerCase() !== 'public' && !access.isMember) {
      throw new ForbiddenException('You are not allowed to open this room');
    }
    return this.listMessages(roomSlug, take);
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
        imageUrl: dto.imageUrl?.trim() || null,
        category: dto.category?.trim() || 'Social',
        privacy: dto.privacy ?? 'Public',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: userPublicSelect,
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
        imageUrl: dto.imageUrl?.trim(),
        category: dto.category?.trim(),
        privacy: dto.privacy,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        category: true,
        privacy: true,
        createdAt: true,
        owner: {
          select: userPublicSelect,
        },
        _count: { select: { messages: true } },
      },
    });
  }

  async joinRoom(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    if (access.isOwner) {
      return { status: 'member' as const };
    }
    if (access.isBlocked) {
      throw new ForbiddenException('You are blocked from this room');
    }
    if (access.privacy.toLowerCase() !== 'public') {
      throw new BadRequestException('This room requires access request');
    }

    await this.prisma.roomMembership.upsert({
      where: {
        roomId_userId: {
          roomId: access.roomId,
          userId,
        },
      },
      update: {},
      create: {
        roomId: access.roomId,
        userId,
      },
    });
    await this.prisma.roomJoinRequest.deleteMany({
      where: { roomId: access.roomId, userId },
    });
    return { status: 'member' as const };
  }

  async requestAccess(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    if (access.isOwner) {
      return { status: 'member' as const };
    }
    if (access.isBlocked) {
      throw new ForbiddenException('You are blocked from this room');
    }
    if (access.isMember) {
      return { status: 'member' as const };
    }
    if (access.privacy.toLowerCase() === 'public') {
      await this.joinRoom(slug, userId);
      return { status: 'member' as const };
    }
    await this.prisma.roomJoinRequest.upsert({
      where: {
        roomId_userId: {
          roomId: access.roomId,
          userId,
        },
      },
      update: {
        status: RoomJoinRequestStatus.PENDING,
      },
      create: {
        roomId: access.roomId,
        userId,
        status: RoomJoinRequestStatus.PENDING,
      },
    });
    return { status: 'requested' as const };
  }

  async leaveRoom(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    if (access.isOwner) {
      throw new BadRequestException('Owner cannot leave their own room');
    }
    await this.prisma.roomMembership.deleteMany({
      where: { roomId: access.roomId, userId },
    });
    return { status: 'left' as const };
  }

  async postMessage(roomSlug: string, senderId: string, body: string) {
    const access = await this.resolveAccessState(roomSlug, senderId);
    if (access.isBlocked) {
      throw new ForbiddenException('You are blocked from this room');
    }
    if (!access.isMember) {
      throw new ForbiddenException('Join the room before sending messages');
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
        roomId: access.roomId,
        senderId,
        body: body.trim(),
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: userPublicSelect },
      },
    });
  }

  private async ensureOwner(slug: string, ownerId: string) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (room.ownerId !== ownerId) {
      throw new ForbiddenException('Only room owner can manage members');
    }
    return room;
  }

  async getRoomManagement(slug: string, ownerId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    const [members, pendingRequests, bannedUsers] = await Promise.all([
      this.prisma.roomMembership.findMany({
        where: { roomId: room.id },
        orderBy: { joinedAt: 'asc' },
        select: {
          userId: true,
          role: true,
          joinedAt: true,
          user: { select: userPublicSelect },
        },
      }),
      this.prisma.roomJoinRequest.findMany({
        where: { roomId: room.id, status: RoomJoinRequestStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        select: {
          userId: true,
          createdAt: true,
          user: { select: userPublicSelect },
        },
      }),
      this.prisma.roomBan.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
        select: {
          userId: true,
          reason: true,
          createdAt: true,
          user: { select: userPublicSelect },
        },
      }),
    ]);
    return { members, pendingRequests, bannedUsers };
  }

  async approveJoinRequest(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    if (userId === ownerId) {
      return { status: 'member' as const };
    }
    await this.prisma.roomBan.deleteMany({ where: { roomId: room.id, userId } });
    await this.prisma.roomMembership.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: {},
      create: { roomId: room.id, userId },
    });
    await this.prisma.roomJoinRequest.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: { status: RoomJoinRequestStatus.APPROVED },
      create: { roomId: room.id, userId, status: RoomJoinRequestStatus.APPROVED },
    });
    return { status: 'member' as const };
  }

  async rejectJoinRequest(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    await this.prisma.roomJoinRequest.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: { status: RoomJoinRequestStatus.REJECTED },
      create: { roomId: room.id, userId, status: RoomJoinRequestStatus.REJECTED },
    });
    return { status: 'rejected' as const };
  }

  async removeMember(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    if (userId === ownerId) {
      throw new BadRequestException('Owner cannot be removed');
    }
    await this.prisma.roomMembership.deleteMany({ where: { roomId: room.id, userId } });
    return { status: 'removed' as const };
  }

  async banMember(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    if (userId === ownerId) {
      throw new BadRequestException('Owner cannot be banned');
    }
    await this.prisma.roomMembership.deleteMany({ where: { roomId: room.id, userId } });
    await this.prisma.roomJoinRequest.deleteMany({ where: { roomId: room.id, userId } });
    await this.prisma.roomBan.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: {},
      create: { roomId: room.id, userId },
    });
    return { status: 'banned' as const };
  }

  async unbanMember(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    await this.prisma.roomBan.deleteMany({ where: { roomId: room.id, userId } });
    return { status: 'unbanned' as const };
  }

  async deleteRoom(slug: string, ownerId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    await this.prisma.room.delete({ where: { id: room.id } });
    return { status: 'deleted' as const };
  }
}
