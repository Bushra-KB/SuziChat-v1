import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { RoomJoinRequestStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROOMS_CATALOG_CHANNEL } from '../realtime/realtime-channels';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

/** User fields exposed on messages, members, and room owners. */
const userPublicSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const DEFAULT_ROOM_CATEGORIES = [
  'Social',
  'Music',
  'Sports',
  'Chill',
  'Dating',
  'Media',
  'Travel',
];
const MAX_OWNED_ROOMS_PER_USER = 5;
const ROOM_ROLE_MEMBER = 'member';
const ROOM_ROLE_MODERATOR = 'moderator';
const ROOM_EMPTY_GRACE_MS = 5 * 60 * 1000;
const CLEANUP_TICK_MS = 30 * 1000;

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
  membershipRole: string | null;
  membershipJoinedAt: Date | null;
  isModerator: boolean;
  isBlocked: boolean;
  hasPendingRequest: boolean;
};

@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly cleanupTicker: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {
    this.cleanupTicker = setInterval(() => {
      void this.runScheduledRoomCleanup();
    }, CLEANUP_TICK_MS);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTicker);
  }

  private roomChannel(roomSlug: string) {
    return `room:${roomSlug}`;
  }

  private roomStatsChannel(roomSlug: string) {
    return `roomstats:${roomSlug}`;
  }

  async markRoomActive(slug: string) {
    await this.prisma.room.updateMany({
      where: { slug, deleteScheduledAt: { not: null } },
      data: { emptySince: null, deleteScheduledAt: null },
    });
  }

  async markRoomEmpty(slug: string) {
    const now = new Date();
    await this.prisma.room.updateMany({
      where: { slug, deleteScheduledAt: null },
      data: {
        emptySince: now,
        deleteScheduledAt: new Date(now.getTime() + ROOM_EMPTY_GRACE_MS),
      },
    });
  }

  async runScheduledRoomCleanup(now = new Date()) {
    const rooms = await this.prisma.room.findMany({
      where: { deleteScheduledAt: { lte: now } },
      select: { id: true, slug: true },
      take: 50,
    });
    if (!rooms.length) return { deleted: 0 };

    let deletedCount = 0;
    for (const room of rooms) {
      const deleted = await this.prisma.room.deleteMany({
        where: { id: room.id, deleteScheduledAt: { lte: now } },
      });
      if (deleted.count === 0) continue;
      deletedCount += deleted.count;
      this.realtimeEvents.emitToChannel(
        this.roomChannel(room.slug),
        'room:deleted',
        { roomSlug: room.slug },
      );
      this.realtimeEvents.emitToChannel(
        this.roomStatsChannel(room.slug),
        'room:deleted',
        { roomSlug: room.slug },
      );
      this.realtimeEvents.emitToChannel(ROOMS_CATALOG_CHANNEL, 'rooms:update', {
        reason: 'auto_deleted',
        roomSlug: room.slug,
      });
    }
    return { deleted: deletedCount };
  }

  async listCategories() {
    const managedCategories = await this.prisma.roomCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { name: true },
    });
    const grouped = await this.prisma.room.groupBy({
      by: ['category'],
    });
    const dbCategories = grouped
      .map((row) => row.category?.trim())
      .filter((row): row is string => Boolean(row));
    return [
      ...new Set([
        ...managedCategories.map((row) => row.name),
        ...DEFAULT_ROOM_CATEGORIES,
        ...dbCategories,
      ]),
    ];
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
          select: { id: true, role: true, joinedAt: true },
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
    return {
      status: deleted.count > 0 ? ('cancelled' as const) : ('none' as const),
    };
  }

  private async resolveAccessState(
    slug: string,
    userId: string,
  ): Promise<RoomAccessState> {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: {
        id: true,
        ownerId: true,
        privacy: true,
        memberships: {
          where: { userId },
          select: { id: true, role: true, joinedAt: true },
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
    const membershipRole = room.memberships[0]?.role ?? null;
    const membershipJoinedAt = room.memberships[0]?.joinedAt ?? null;
    return {
      roomId: room.id,
      ownerId: room.ownerId,
      privacy: room.privacy,
      isOwner: room.ownerId === userId,
      isMember: room.ownerId === userId || room.memberships.length > 0,
      membershipRole,
      membershipJoinedAt,
      isModerator: membershipRole === ROOM_ROLE_MODERATOR,
      isBlocked: room.bans.length > 0,
      hasPendingRequest: room.joinRequests.length > 0,
    };
  }

  async getRoomAccess(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    const privacy = access.privacy.toLowerCase();
    const canOpen =
      !access.isBlocked && (privacy === 'public' || access.isMember);
    return {
      roomSlug: slug,
      isOwner: access.isOwner,
      isModerator: access.isModerator,
      role: access.isOwner ? 'host' : (access.membershipRole ?? null),
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
        memberships: {
          where: { role: ROOM_ROLE_MODERATOR },
          orderBy: { joinedAt: 'asc' },
          select: {
            userId: true,
            role: true,
            user: { select: userPublicSelect },
          },
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

    const { memberships, ...publicRoom } = room;
    return {
      ...publicRoom,
      moderators: memberships,
    };
  }

  async listPublicUsersByIds(userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: userPublicSelect,
    });
    const byId = new Map(users.map((user) => [user.id, user]));
    return uniqueIds.flatMap((id) => {
      const user = byId.get(id);
      return user ? [user] : [];
    });
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
    if (access.isOwner) {
      return this.listMessages(roomSlug, take);
    }
    if (!access.isMember || !access.membershipJoinedAt) {
      return [];
    }
    const messages = await this.prisma.roomMessage.findMany({
      where: {
        roomId: access.roomId,
        createdAt: { gte: access.membershipJoinedAt },
      },
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

  private slugifyRoomName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  async createRoom(
    ownerId: string,
    dto: CreateRoomDto,
    actorRole: UserRole = UserRole.USER,
  ) {
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

    if (actorRole !== UserRole.ADMIN) {
      const ownedRooms = await this.prisma.room.count({ where: { ownerId } });
      if (ownedRooms >= MAX_OWNED_ROOMS_PER_USER) {
        throw new BadRequestException(
          `You can create up to ${MAX_OWNED_ROOMS_PER_USER} rooms at a time. Delete one of your rooms before creating a new one.`,
        );
      }
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
    await this.ensureManager(
      slug,
      userId,
      'Only room owner or moderator can edit this room',
    );

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

  async listInviteCandidates(slug: string, userId: string) {
    const access = await this.resolveAccessState(slug, userId);
    if (access.isBlocked || !access.isMember) {
      throw new ForbiddenException('Join the room before inviting friends');
    }

    const [room, friendships, blockedPairs] = await Promise.all([
      this.prisma.room.findUnique({
        where: { id: access.roomId },
        select: {
          ownerId: true,
          memberships: { select: { userId: true } },
          bans: { select: { userId: true } },
          joinRequests: {
            where: { status: RoomJoinRequestStatus.PENDING },
            select: { userId: true },
          },
        },
      }),
      this.prisma.friendship.findMany({
        where: { userId },
        select: { friend: { select: userPublicSelect } },
      }),
      this.prisma.userBlock.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const excludedUserIds = new Set<string>([
      userId,
      room.ownerId,
      ...room.memberships.map((row) => row.userId),
      ...room.bans.map((row) => row.userId),
      ...room.joinRequests.map((row) => row.userId),
    ]);
    for (const pair of blockedPairs) {
      excludedUserIds.add(
        pair.blockerId === userId ? pair.blockedId : pair.blockerId,
      );
    }

    return friendships
      .map((row) => row.friend)
      .filter((friend) => !excludedUserIds.has(friend.id))
      .sort((a, b) =>
        (a.displayName?.trim() || a.username).localeCompare(
          b.displayName?.trim() || b.username,
        ),
      );
  }

  async sendInvite(slug: string, fromUserId: string, targetUserId: string) {
    if (fromUserId === targetUserId) {
      throw new BadRequestException('Choose a friend to invite');
    }
    const access = await this.resolveAccessState(slug, fromUserId);
    if (access.isBlocked || !access.isMember) {
      throw new ForbiddenException('Join the room before inviting friends');
    }

    const [room, friendship, blocked, targetMembership, targetBan, targetRequest] =
      await Promise.all([
      this.prisma.room.findUnique({
        where: { id: access.roomId },
        select: { slug: true, name: true, ownerId: true },
      }),
      this.prisma.friendship.findUnique({
        where: {
          userId_friendId: {
            userId: fromUserId,
            friendId: targetUserId,
          },
        },
        select: { id: true },
      }),
      this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: fromUserId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: fromUserId },
          ],
        },
        select: { id: true },
      }),
      this.prisma.roomMembership.findUnique({
        where: {
          roomId_userId: {
            roomId: access.roomId,
            userId: targetUserId,
          },
        },
        select: { id: true },
      }),
      this.prisma.roomBan.findUnique({
        where: {
          roomId_userId: {
            roomId: access.roomId,
            userId: targetUserId,
          },
        },
        select: { id: true },
      }),
      this.prisma.roomJoinRequest.findUnique({
        where: {
          roomId_userId: {
            roomId: access.roomId,
            userId: targetUserId,
          },
        },
        select: { status: true },
      }),
    ]);

    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (!friendship) {
      throw new BadRequestException('You can invite friends only');
    }
    if (blocked) {
      throw new ForbiddenException('Cannot invite this user');
    }
    if (room.ownerId === targetUserId || targetMembership) {
      throw new BadRequestException('This user is already in the room');
    }
    if (targetBan) {
      throw new ForbiddenException('This user is banned from this room');
    }
    if (targetRequest?.status === RoomJoinRequestStatus.PENDING) {
      throw new BadRequestException('This user already has a pending room request');
    }

    const payload = {
      roomSlug: room.slug,
      fromUserId,
      targetUserId,
      title: room.name,
      deepLink: `/app/rooms/${room.slug}`,
      sentAt: new Date().toISOString(),
    };
    this.realtimeEvents.emitToUser(targetUserId, 'room:invite', payload);
    return { ok: true };
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

  private async ensureManager(
    slug: string,
    actorId: string,
    forbiddenMessage = 'Only room owner or moderator can manage members',
  ) {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: {
        id: true,
        ownerId: true,
        memberships: {
          where: { userId: actorId },
          select: { role: true },
          take: 1,
        },
      },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const actorRole = room.memberships[0]?.role ?? null;
    const isOwner = room.ownerId === actorId;
    const isModerator = actorRole === ROOM_ROLE_MODERATOR;
    if (!isOwner && !isModerator) {
      throw new ForbiddenException(forbiddenMessage);
    }
    return {
      id: room.id,
      ownerId: room.ownerId,
      actorId,
      isOwner,
      isModerator,
    };
  }

  private async ensureModeratorCanTarget(
    room: { id: string; ownerId: string; isOwner: boolean },
    targetUserId: string,
  ) {
    if (targetUserId === room.ownerId) {
      throw new BadRequestException('Owner cannot be managed');
    }
    if (!room.isOwner) {
      const targetMembership = await this.prisma.roomMembership.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: targetUserId } },
        select: { role: true },
      });
      if (targetMembership?.role === ROOM_ROLE_MODERATOR) {
        throw new ForbiddenException(
          'Moderators cannot manage other moderators',
        );
      }
    }
  }

  async getRoomManagement(slug: string, actorId: string) {
    const room = await this.ensureManager(slug, actorId);
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
    return {
      actor: {
        isOwner: room.isOwner,
        isModerator: room.isModerator,
      },
      members,
      pendingRequests,
      bannedUsers,
    };
  }

  async approveJoinRequest(slug: string, actorId: string, userId: string) {
    const room = await this.ensureManager(slug, actorId);
    if (userId === room.ownerId) {
      return { status: 'member' as const };
    }
    await this.prisma.roomBan.deleteMany({
      where: { roomId: room.id, userId },
    });
    await this.prisma.roomMembership.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: {},
      create: { roomId: room.id, userId, role: ROOM_ROLE_MEMBER },
    });
    await this.prisma.roomJoinRequest.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: { status: RoomJoinRequestStatus.APPROVED },
      create: {
        roomId: room.id,
        userId,
        status: RoomJoinRequestStatus.APPROVED,
      },
    });
    return { status: 'member' as const };
  }

  async rejectJoinRequest(slug: string, actorId: string, userId: string) {
    const room = await this.ensureManager(slug, actorId);
    await this.prisma.roomJoinRequest.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: { status: RoomJoinRequestStatus.REJECTED },
      create: {
        roomId: room.id,
        userId,
        status: RoomJoinRequestStatus.REJECTED,
      },
    });
    return { status: 'rejected' as const };
  }

  async removeMember(slug: string, actorId: string, userId: string) {
    const room = await this.ensureManager(slug, actorId);
    await this.ensureModeratorCanTarget(room, userId);
    await this.prisma.roomMembership.deleteMany({
      where: { roomId: room.id, userId },
    });
    return { status: 'removed' as const };
  }

  async banMember(slug: string, actorId: string, userId: string) {
    const room = await this.ensureManager(slug, actorId);
    await this.ensureModeratorCanTarget(room, userId);
    await this.prisma.roomMembership.deleteMany({
      where: { roomId: room.id, userId },
    });
    await this.prisma.roomJoinRequest.deleteMany({
      where: { roomId: room.id, userId },
    });
    await this.prisma.roomBan.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: {},
      create: { roomId: room.id, userId },
    });
    return { status: 'banned' as const };
  }

  async unbanMember(slug: string, actorId: string, userId: string) {
    const room = await this.ensureManager(slug, actorId);
    await this.prisma.roomBan.deleteMany({
      where: { roomId: room.id, userId },
    });
    return { status: 'unbanned' as const };
  }

  async assignModerator(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    if (userId === ownerId) {
      throw new BadRequestException('Owner is already the room host');
    }
    const membership = await this.prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException('Moderator must be a room member');
    }
    await this.prisma.$transaction([
      this.prisma.roomMembership.updateMany({
        where: { roomId: room.id, role: ROOM_ROLE_MODERATOR },
        data: { role: ROOM_ROLE_MEMBER },
      }),
      this.prisma.roomMembership.update({
        where: { roomId_userId: { roomId: room.id, userId } },
        data: { role: ROOM_ROLE_MODERATOR },
      }),
    ]);
    return { status: 'moderator_assigned' as const };
  }

  async removeModerator(slug: string, ownerId: string, userId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    await this.prisma.roomMembership.updateMany({
      where: { roomId: room.id, userId, role: ROOM_ROLE_MODERATOR },
      data: { role: ROOM_ROLE_MEMBER },
    });
    return { status: 'moderator_removed' as const };
  }

  async deleteRoom(slug: string, ownerId: string) {
    const room = await this.ensureOwner(slug, ownerId);
    await this.prisma.room.delete({ where: { id: room.id } });
    return { status: 'deleted' as const };
  }
}
