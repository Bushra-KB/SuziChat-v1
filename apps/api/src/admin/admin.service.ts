import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GameLobbyStatus,
  GameSessionStatus,
  PostKind,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function clampTake(value?: string, fallback = 40, max = 120) {
  const n = value ? Number.parseInt(value, 10) : fallback;
  return Number.isFinite(n) ? Math.min(max, Math.max(1, n)) : fallback;
}

function clampSkip(value?: string) {
  const n = value ? Number.parseInt(value, 10) : 0;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function boolOrUndefined(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [
      users,
      rooms,
      posts,
      roomMessages,
      directMessages,
      datingProfiles,
      datingMatches,
      gameLobbies,
      activeSessions,
      notifications,
      recentUsers,
      recentRooms,
      recentPosts,
      recentGameSessions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.room.count(),
      this.prisma.post.count(),
      this.prisma.roomMessage.count(),
      this.prisma.directMessage.count(),
      this.prisma.datingProfile.count(),
      this.prisma.datingMatch.count(),
      this.prisma.gameLobby.count(),
      this.prisma.gameSession.count({ where: { status: GameSessionStatus.ACTIVE } }),
      this.prisma.notification.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.room.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { owner: { select: { username: true, displayName: true } }, _count: { select: { memberships: true, messages: true } } },
      }),
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { author: { select: { username: true, displayName: true } }, _count: { select: { likes: true, comments: true, views: true } } },
      }),
      this.prisma.gameSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { lobby: { select: { title: true, gameType: true } }, winnerUser: { select: { username: true, displayName: true } } },
      }),
    ]);

    return {
      stats: {
        users,
        rooms,
        posts,
        roomMessages,
        directMessages,
        datingProfiles,
        datingMatches,
        gameLobbies,
        activeSessions,
        notifications,
      },
      recentUsers,
      recentRooms,
      recentPosts,
      recentGameSessions,
    };
  }

  listUsers(query: { search?: string; role?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.role === UserRole.ADMIN || query.role === UserRole.USER
        ? { role: query.role }
        : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        country: true,
        role: true,
        isEmailVerified: true,
        isAdultConfirmed: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            roomsOwned: true,
            posts: true,
            roomMessages: true,
            dmsSent: true,
            dmsReceived: true,
          },
        },
      },
    });
  }

  async updateUser(userId: string, body: Record<string, unknown>) {
    const data: Prisma.UserUpdateInput = {};
    if (body.role === UserRole.ADMIN || body.role === UserRole.USER) {
      data.role = body.role;
    }
    const emailVerified = boolOrUndefined(body.isEmailVerified);
    if (emailVerified !== undefined) data.isEmailVerified = emailVerified;
    const adultConfirmed = boolOrUndefined(body.isAdultConfirmed);
    if (adultConfirmed !== undefined) data.isAdultConfirmed = adultConfirmed;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No supported user fields provided.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isEmailVerified: true,
        isAdultConfirmed: true,
        updatedAt: true,
      },
    });
  }

  deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });
  }

  listRooms(query: { search?: string; category?: string; privacy?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    return this.prisma.room.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.privacy ? { privacy: query.privacy } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        owner: { select: { id: true, username: true, displayName: true, email: true } },
        _count: { select: { memberships: true, messages: true, joinRequests: true, bans: true } },
      },
    });
  }

  async updateRoom(slug: string, body: Record<string, unknown>) {
    const data: Prisma.RoomUpdateInput = {};
    const name = stringOrUndefined(body.name);
    const description = typeof body.description === 'string' ? body.description.trim() : undefined;
    const category = stringOrUndefined(body.category);
    const privacy = stringOrUndefined(body.privacy);
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (category) data.category = category;
    if (privacy) data.privacy = privacy;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No supported room fields provided.');
    }
    return this.prisma.room.update({
      where: { slug },
      data,
      include: { owner: { select: { username: true, displayName: true } } },
    });
  }

  deleteRoom(slug: string) {
    return this.prisma.room.delete({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
  }

  listRoomMessages(query: { search?: string; roomId?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    return this.prisma.roomMessage.findMany({
      where: {
        ...(query.roomId ? { roomId: query.roomId } : {}),
        ...(search ? { body: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        room: { select: { id: true, slug: true, name: true } },
        sender: { select: { id: true, username: true, displayName: true, email: true } },
      },
    });
  }

  deleteRoomMessage(id: string) {
    return this.prisma.roomMessage.delete({ where: { id }, select: { id: true } });
  }

  listDirectMessages(query: { search?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    return this.prisma.directMessage.findMany({
      where: search ? { body: { contains: search, mode: 'insensitive' } } : {},
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        sender: { select: { id: true, username: true, displayName: true, email: true } },
        recipient: { select: { id: true, username: true, displayName: true, email: true } },
      },
    });
  }

  deleteDirectMessage(id: string) {
    return this.prisma.directMessage.delete({ where: { id }, select: { id: true } });
  }

  listPosts(query: { kind?: string; search?: string; take?: string; skip?: string }) {
    const kind = query.kind === PostKind.REEL || query.kind === PostKind.SNAP ? query.kind : undefined;
    const search = query.search?.trim();
    return this.prisma.post.findMany({
      where: {
        ...(kind ? { kind } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { caption: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        author: { select: { id: true, username: true, displayName: true, email: true } },
        _count: { select: { likes: true, comments: true, views: true } },
      },
    });
  }

  async updatePost(id: string, body: Record<string, unknown>) {
    const visibility = stringOrUndefined(body.visibility);
    if (!visibility) throw new BadRequestException('visibility is required.');
    return this.prisma.post.update({ where: { id }, data: { visibility } });
  }

  deletePost(id: string) {
    return this.prisma.post.delete({ where: { id }, select: { id: true, kind: true } });
  }

  listPostComments(query: { search?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    return this.prisma.postComment.findMany({
      where: search ? { body: { contains: search, mode: 'insensitive' } } : {},
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
        post: { select: { id: true, kind: true, title: true } },
      },
    });
  }

  deletePostComment(id: string) {
    return this.prisma.postComment.delete({ where: { id }, select: { id: true } });
  }

  listGames() {
    return Promise.all([
      this.prisma.gameLobby.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 80,
        include: {
          owner: { select: { username: true, displayName: true, email: true } },
          _count: { select: { seats: true, sessions: true, events: true } },
        },
      }),
      this.prisma.gameSession.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 80,
        include: {
          lobby: { select: { title: true, slug: true, gameType: true } },
          winnerUser: { select: { username: true, displayName: true } },
        },
      }),
    ]).then(([lobbies, sessions]) => ({ lobbies, sessions }));
  }

  async closeGameSession(id: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Game session not found.');
    const updated = await this.prisma.gameSession.update({
      where: { id },
      data: { status: GameSessionStatus.CANCELED, endedAt: new Date() },
    });
    await this.prisma.gameLobby.updateMany({
      where: { id: session.lobbyId, status: GameLobbyStatus.IN_PROGRESS },
      data: { status: GameLobbyStatus.OPEN },
    });
    return updated;
  }

  deleteGameLobby(id: string) {
    return this.prisma.gameLobby.delete({ where: { id }, select: { id: true, title: true } });
  }

  listDating() {
    return Promise.all([
      this.prisma.datingProfile.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 80,
        include: { user: { select: { id: true, username: true, displayName: true, email: true } } },
      }),
      this.prisma.datingMatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: {
          userA: { select: { id: true, username: true, displayName: true, email: true } },
          userB: { select: { id: true, username: true, displayName: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]).then(([profiles, matches]) => ({ profiles, matches }));
  }

  async updateDatingProfile(id: string, body: Record<string, unknown>) {
    const isDiscoverable = boolOrUndefined(body.isDiscoverable);
    if (isDiscoverable === undefined) {
      throw new BadRequestException('isDiscoverable is required.');
    }
    return this.prisma.datingProfile.update({ where: { id }, data: { isDiscoverable } });
  }

  deleteDatingProfile(id: string) {
    return this.prisma.datingProfile.delete({ where: { id }, select: { id: true, userId: true } });
  }

  deleteDatingMatch(id: string) {
    return this.prisma.datingMatch.delete({ where: { id }, select: { id: true } });
  }

  listNotifications(query: { take?: string; skip?: string }) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: { user: { select: { id: true, username: true, displayName: true, email: true } } },
    });
  }

  async createNotification(body: Record<string, unknown>) {
    const title = stringOrUndefined(body.title);
    const text = stringOrUndefined(body.body);
    const userId = stringOrUndefined(body.userId);
    const broadcast = body.broadcast === true;
    if (!title || !text) throw new BadRequestException('title and body are required.');
    if (!broadcast && !userId) throw new BadRequestException('userId is required unless broadcast=true.');
    if (broadcast) {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      await this.prisma.notification.createMany({
        data: users.map((user) => ({ userId: user.id, title, body: text })),
      });
      return { ok: true, sent: users.length };
    }
    return this.prisma.notification.create({ data: { userId: userId as string, title, body: text } });
  }

  listRoomCategories() {
    return this.prisma.roomCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createRoomCategory(body: Record<string, unknown>) {
    const name = stringOrUndefined(body.name);
    if (!name) throw new BadRequestException('name is required.');
    return this.prisma.roomCategory.create({
      data: {
        name,
        description: stringOrUndefined(body.description),
        color: stringOrUndefined(body.color),
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: boolOrUndefined(body.isActive) ?? true,
      },
    });
  }

  async updateRoomCategory(id: string, body: Record<string, unknown>) {
    const data: Prisma.RoomCategoryUpdateInput = {};
    const name = stringOrUndefined(body.name);
    if (name) data.name = name;
    if (typeof body.description === 'string') data.description = body.description.trim();
    if (typeof body.color === 'string') data.color = body.color.trim();
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
    const isActive = boolOrUndefined(body.isActive);
    if (isActive !== undefined) data.isActive = isActive;
    return this.prisma.roomCategory.update({ where: { id }, data });
  }

  deleteRoomCategory(id: string) {
    return this.prisma.roomCategory.delete({ where: { id }, select: { id: true, name: true } });
  }
}
