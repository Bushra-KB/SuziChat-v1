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
  RoomJoinRequestStatus,
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

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const today = daysAgo(0);
    const sevenDaysAgo = daysAgo(6);
    const [
      users,
      admins,
      verifiedUsers,
      adultConfirmedUsers,
      newUsersToday,
      newUsers7d,
      rooms,
      rooms7d,
      posts,
      posts7d,
      roomMessages,
      roomMessages7d,
      directMessages,
      directMessages7d,
      datingProfiles,
      discoverableDatingProfiles,
      datingMatches,
      gameLobbies,
      activeSessions,
      finishedSessions7d,
      notifications,
      notifications7d,
      recentUsers,
      recentRooms,
      recentPosts,
      recentGameSessions,
      recentAuditLogs,
      moderation,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.user.count({ where: { isAdultConfirmed: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.room.count(),
      this.prisma.room.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.roomMessage.count(),
      this.prisma.roomMessage.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.directMessage.count(),
      this.prisma.directMessage.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.datingProfile.count(),
      this.prisma.datingProfile.count({ where: { isDiscoverable: true } }),
      this.prisma.datingMatch.count(),
      this.prisma.gameLobby.count(),
      this.prisma.gameSession.count({
        where: { status: GameSessionStatus.ACTIVE },
      }),
      this.prisma.gameSession.count({
        where: {
          status: GameSessionStatus.FINISHED,
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.notification.count(),
      this.prisma.notification.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
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
        include: {
          owner: { select: { username: true, displayName: true } },
          _count: { select: { memberships: true, messages: true } },
        },
      }),
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          author: { select: { username: true, displayName: true } },
          _count: { select: { likes: true, comments: true, views: true } },
        },
      }),
      this.prisma.gameSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          lobby: { select: { title: true, gameType: true } },
          winnerUser: { select: { username: true, displayName: true } },
        },
      }),
      this.prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      this.moderationQueues(),
    ]);

    return {
      stats: {
        users,
        admins,
        verifiedUsers,
        unverifiedUsers: users - verifiedUsers,
        adultConfirmedUsers,
        adultPendingUsers: users - adultConfirmedUsers,
        newUsersToday,
        newUsers7d,
        rooms,
        rooms7d,
        posts,
        posts7d,
        roomMessages,
        roomMessages7d,
        directMessages,
        directMessages7d,
        datingProfiles,
        discoverableDatingProfiles,
        hiddenDatingProfiles: datingProfiles - discoverableDatingProfiles,
        datingMatches,
        gameLobbies,
        activeSessions,
        finishedSessions7d,
        notifications,
        notifications7d,
      },
      health: {
        userVerificationRate: users
          ? Math.round((verifiedUsers / users) * 100)
          : 0,
        adultConfirmationRate: users
          ? Math.round((adultConfirmedUsers / users) * 100)
          : 0,
        discoverableDatingRate: datingProfiles
          ? Math.round((discoverableDatingProfiles / datingProfiles) * 100)
          : 0,
        activeGameSessions: activeSessions,
      },
      recentUsers,
      recentRooms,
      recentPosts,
      recentGameSessions,
      recentAuditLogs,
      moderation,
    };
  }

  moderationQueues() {
    return Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [{ isEmailVerified: false }, { isAdultConfirmed: false }],
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isEmailVerified: true,
          isAdultConfirmed: true,
          createdAt: true,
        },
      }),
      this.prisma.post.findMany({
        where: { visibility: { not: 'Public' } },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        include: {
          author: { select: { id: true, username: true, displayName: true } },
        },
      }),
      this.prisma.datingProfile.findMany({
        where: { isDiscoverable: false },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
      this.prisma.roomJoinRequest.findMany({
        where: { status: RoomJoinRequestStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          room: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
    ]).then(([users, posts, datingProfiles, roomJoinRequests]) => ({
      users,
      posts,
      datingProfiles,
      roomJoinRequests,
    }));
  }

  listAuditLogs(query: { take?: string; skip?: string }) {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take, 50),
      skip: clampSkip(query.skip),
      include: {
        admin: {
          select: { id: true, username: true, displayName: true, email: true },
        },
      },
    });
  }

  private logAdminAction(
    adminId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    if (!adminId) return Promise.resolve();
    return this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata: toJson(metadata),
      },
    });
  }

  listUsers(query: {
    search?: string;
    role?: string;
    take?: string;
    skip?: string;
  }) {
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

  async updateUser(
    userId: string,
    body: Record<string, unknown>,
    adminId?: string,
  ) {
    const data: Prisma.UserUpdateInput = {};
    if (body.role === UserRole.ADMIN || body.role === UserRole.USER) {
      if (userId === adminId && body.role === UserRole.USER) {
        throw new BadRequestException('You cannot remove your own admin role.');
      }
      data.role = body.role;
    }
    const emailVerified = boolOrUndefined(body.isEmailVerified);
    if (emailVerified !== undefined) data.isEmailVerified = emailVerified;
    const adultConfirmed = boolOrUndefined(body.isAdultConfirmed);
    if (adultConfirmed !== undefined) data.isAdultConfirmed = adultConfirmed;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No supported user fields provided.');
    }
    const updated = await this.prisma.user.update({
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
    await this.logAdminAction(adminId, 'update_user', 'User', userId, data);
    return updated;
  }

  async deleteUser(userId: string, adminId?: string) {
    if (userId === adminId) {
      throw new BadRequestException(
        'You cannot delete your own admin account.',
      );
    }
    const deleted = await this.prisma.user.delete({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });
    await this.logAdminAction(adminId, 'delete_user', 'User', userId, deleted);
    return deleted;
  }

  listRooms(query: {
    search?: string;
    category?: string;
    privacy?: string;
    take?: string;
    skip?: string;
  }) {
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
        owner: {
          select: { id: true, username: true, displayName: true, email: true },
        },
        _count: {
          select: {
            memberships: true,
            messages: true,
            joinRequests: true,
            bans: true,
          },
        },
      },
    });
  }

  async updateRoom(
    slug: string,
    body: Record<string, unknown>,
    adminId?: string,
  ) {
    const data: Prisma.RoomUpdateInput = {};
    const name = stringOrUndefined(body.name);
    const description =
      typeof body.description === 'string'
        ? body.description.trim()
        : undefined;
    const category = stringOrUndefined(body.category);
    const privacy = stringOrUndefined(body.privacy);
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (category) data.category = category;
    if (privacy) data.privacy = privacy;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No supported room fields provided.');
    }
    const updated = await this.prisma.room.update({
      where: { slug },
      data,
      include: { owner: { select: { username: true, displayName: true } } },
    });
    await this.logAdminAction(adminId, 'update_room', 'Room', updated.id, {
      slug,
      data,
    });
    return updated;
  }

  async deleteRoom(slug: string, adminId?: string) {
    const deleted = await this.prisma.room.delete({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_room',
      'Room',
      deleted.id,
      deleted,
    );
    return deleted;
  }

  listRoomMessages(query: {
    search?: string;
    roomId?: string;
    take?: string;
    skip?: string;
  }) {
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
        sender: {
          select: { id: true, username: true, displayName: true, email: true },
        },
      },
    });
  }

  async deleteRoomMessage(id: string, adminId?: string) {
    const deleted = await this.prisma.roomMessage.delete({
      where: { id },
      select: { id: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_room_message',
      'RoomMessage',
      id,
    );
    return deleted;
  }

  listDirectMessages(query: { search?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    return this.prisma.directMessage.findMany({
      where: search ? { body: { contains: search, mode: 'insensitive' } } : {},
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, email: true },
        },
        recipient: {
          select: { id: true, username: true, displayName: true, email: true },
        },
      },
    });
  }

  async deleteDirectMessage(id: string, adminId?: string) {
    const deleted = await this.prisma.directMessage.delete({
      where: { id },
      select: { id: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_direct_message',
      'DirectMessage',
      id,
    );
    return deleted;
  }

  listPosts(query: {
    kind?: string;
    search?: string;
    take?: string;
    skip?: string;
  }) {
    const kind =
      query.kind === PostKind.REEL || query.kind === PostKind.SNAP
        ? query.kind
        : undefined;
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
        author: {
          select: { id: true, username: true, displayName: true, email: true },
        },
        _count: { select: { likes: true, comments: true, views: true } },
      },
    });
  }

  async updatePost(
    id: string,
    body: Record<string, unknown>,
    adminId?: string,
  ) {
    const visibility = stringOrUndefined(body.visibility);
    if (!visibility) throw new BadRequestException('visibility is required.');
    const updated = await this.prisma.post.update({
      where: { id },
      data: { visibility },
    });
    await this.logAdminAction(adminId, 'update_post', 'Post', id, {
      visibility,
    });
    return updated;
  }

  async deletePost(id: string, adminId?: string) {
    const deleted = await this.prisma.post.delete({
      where: { id },
      select: { id: true, kind: true },
    });
    await this.logAdminAction(adminId, 'delete_post', 'Post', id, deleted);
    return deleted;
  }

  listPostComments(query: { search?: string; take?: string; skip?: string }) {
    const search = query.search?.trim();
    return this.prisma.postComment.findMany({
      where: search ? { body: { contains: search, mode: 'insensitive' } } : {},
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        user: {
          select: { id: true, username: true, displayName: true, email: true },
        },
        post: { select: { id: true, kind: true, title: true } },
      },
    });
  }

  async deletePostComment(id: string, adminId?: string) {
    const deleted = await this.prisma.postComment.delete({
      where: { id },
      select: { id: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_post_comment',
      'PostComment',
      id,
    );
    return deleted;
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

  async closeGameSession(id: string, adminId?: string) {
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
    await this.logAdminAction(
      adminId,
      'close_game_session',
      'GameSession',
      id,
      {
        lobbyId: session.lobbyId,
      },
    );
    return updated;
  }

  async deleteGameLobby(id: string, adminId?: string) {
    const deleted = await this.prisma.gameLobby.delete({
      where: { id },
      select: { id: true, title: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_game_lobby',
      'GameLobby',
      id,
      deleted,
    );
    return deleted;
  }

  listDating() {
    return Promise.all([
      this.prisma.datingProfile.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 80,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.datingMatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: {
          userA: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
          userB: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
            },
          },
          _count: { select: { messages: true } },
        },
      }),
    ]).then(([profiles, matches]) => ({ profiles, matches }));
  }

  async updateDatingProfile(
    id: string,
    body: Record<string, unknown>,
    adminId?: string,
  ) {
    const isDiscoverable = boolOrUndefined(body.isDiscoverable);
    if (isDiscoverable === undefined) {
      throw new BadRequestException('isDiscoverable is required.');
    }
    const updated = await this.prisma.datingProfile.update({
      where: { id },
      data: { isDiscoverable },
    });
    await this.logAdminAction(
      adminId,
      'update_dating_profile',
      'DatingProfile',
      id,
      {
        isDiscoverable,
      },
    );
    return updated;
  }

  async deleteDatingProfile(id: string, adminId?: string) {
    const deleted = await this.prisma.datingProfile.delete({
      where: { id },
      select: { id: true, userId: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_dating_profile',
      'DatingProfile',
      id,
      deleted,
    );
    return deleted;
  }

  async deleteDatingMatch(id: string, adminId?: string) {
    const deleted = await this.prisma.datingMatch.delete({
      where: { id },
      select: { id: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_dating_match',
      'DatingMatch',
      id,
    );
    return deleted;
  }

  listNotifications(query: { take?: string; skip?: string }) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: clampTake(query.take),
      skip: clampSkip(query.skip),
      include: {
        user: {
          select: { id: true, username: true, displayName: true, email: true },
        },
      },
    });
  }

  async createNotification(body: Record<string, unknown>, adminId?: string) {
    const title = stringOrUndefined(body.title);
    const text = stringOrUndefined(body.body);
    const userId = stringOrUndefined(body.userId);
    const broadcast = body.broadcast === true;
    if (!title || !text)
      throw new BadRequestException('title and body are required.');
    if (!broadcast && !userId)
      throw new BadRequestException(
        'userId is required unless broadcast=true.',
      );
    if (broadcast) {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      await this.prisma.notification.createMany({
        data: users.map((user) => ({ userId: user.id, title, body: text })),
      });
      await this.logAdminAction(
        adminId,
        'broadcast_notification',
        'Notification',
        null,
        {
          title,
          sent: users.length,
        },
      );
      return { ok: true, sent: users.length };
    }
    const notification = await this.prisma.notification.create({
      data: { userId: userId as string, title, body: text },
    });
    await this.logAdminAction(
      adminId,
      'create_notification',
      'Notification',
      notification.id,
      {
        title,
        userId,
      },
    );
    return notification;
  }

  listRoomCategories() {
    return this.prisma.roomCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createRoomCategory(body: Record<string, unknown>, adminId?: string) {
    const name = stringOrUndefined(body.name);
    if (!name) throw new BadRequestException('name is required.');
    const category = await this.prisma.roomCategory.create({
      data: {
        name,
        description: stringOrUndefined(body.description),
        color: stringOrUndefined(body.color),
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: boolOrUndefined(body.isActive) ?? true,
      },
    });
    await this.logAdminAction(
      adminId,
      'create_room_category',
      'RoomCategory',
      category.id,
      {
        name,
      },
    );
    return category;
  }

  async updateRoomCategory(
    id: string,
    body: Record<string, unknown>,
    adminId?: string,
  ) {
    const data: Prisma.RoomCategoryUpdateInput = {};
    const name = stringOrUndefined(body.name);
    if (name) data.name = name;
    if (typeof body.description === 'string')
      data.description = body.description.trim();
    if (typeof body.color === 'string') data.color = body.color.trim();
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
    const isActive = boolOrUndefined(body.isActive);
    if (isActive !== undefined) data.isActive = isActive;
    const category = await this.prisma.roomCategory.update({
      where: { id },
      data,
    });
    await this.logAdminAction(
      adminId,
      'update_room_category',
      'RoomCategory',
      id,
      data,
    );
    return category;
  }

  async deleteRoomCategory(id: string, adminId?: string) {
    const deleted = await this.prisma.roomCategory.delete({
      where: { id },
      select: { id: true, name: true },
    });
    await this.logAdminAction(
      adminId,
      'delete_room_category',
      'RoomCategory',
      id,
      deleted,
    );
    return deleted;
  }
}
