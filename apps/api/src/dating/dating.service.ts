import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatingSwipeAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RealtimeStateService } from '../realtime/realtime-state.service';
import {
  deriveMessageKind,
  messageAttachmentSelect,
  sanitizeChatAttachments,
} from '../uploads/attachment-input';
import type { CreateDatingMessageDto } from './dto/create-dating-message.dto';
import type { DatingSwipeDto } from './dto/dating-swipe.dto';
import type { UpsertDatingProfileDto } from './dto/upsert-dating-profile.dto';

const userCardSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  country: true,
  bio: true,
} as const;

const datingMessageSelect = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  senderId: true,
  attachments: { select: messageAttachmentSelect },
  sender: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} as const;

const datingProfileSelect = {
  id: true,
  userId: true,
  datingName: true,
  age: true,
  gender: true,
  headline: true,
  datingBio: true,
  interests: true,
  photoUrl: true,
  photoUrls: true,
  minAgePref: true,
  maxAgePref: true,
  seekGender: true,
  isDiscoverable: true,
  createdAt: true,
  updatedAt: true,
} as const;

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function interestsFromJson(value: Prisma.JsonValue | null): string[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .slice(0, 24);
}

function normalizePhotoUrls(value: string[] | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function profilePhotoUrls(profile: {
  photoUrl: string | null;
  photoUrls?: string[] | null;
}): string[] {
  const urls =
    profile.photoUrls?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (urls.length > 0) {
    return urls;
  }
  return profile.photoUrl?.trim() ? [profile.photoUrl.trim()] : [];
}

@Injectable()
export class DatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly realtimeState: RealtimeStateService,
  ) {}

  private async emitNotificationState(userId: string, reason: string) {
    try {
      this.realtimeEvents.emitToUser(userId, 'notifications:update', { reason });
      const state = await this.realtimeState.buildUserState(userId);
      this.realtimeEvents.emitToUser(userId, 'realtime:state', state);
    } catch {
      // Best-effort: do not fail the primary request if realtime state cannot be refreshed.
    }
  }

  private async blockedUserIds(userId: string) {
    const [blockedByMe, blockedMe] = await Promise.all([
      this.prisma.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      }),
      this.prisma.userBlock.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      }),
    ]);
    return new Set<string>([
      ...blockedByMe.map((r) => r.blockedId),
      ...blockedMe.map((r) => r.blockerId),
    ]);
  }

  private async datingExclusionIds(viewerId: string) {
    const blocked = await this.blockedUserIds(viewerId);
    return new Set<string>([viewerId, ...blocked]);
  }

  private async viewerDatingState(viewerId: string, targetUserIds: string[]) {
    const ids = [...new Set(targetUserIds)].filter((id) => id !== viewerId);
    if (ids.length === 0) {
      return {
        swipes: new Map<string, DatingSwipeAction>(),
        matches: new Set<string>(),
      };
    }

    const [swipes, matchesA, matchesB] = await Promise.all([
      this.prisma.datingSwipe.findMany({
        where: { fromUserId: viewerId, toUserId: { in: ids } },
        select: { toUserId: true, action: true },
      }),
      this.prisma.datingMatch.findMany({
        where: { userAId: viewerId, userBId: { in: ids } },
        select: { userBId: true },
      }),
      this.prisma.datingMatch.findMany({
        where: { userBId: viewerId, userAId: { in: ids } },
        select: { userAId: true },
      }),
    ]);

    return {
      swipes: new Map(swipes.map((row) => [row.toUserId, row.action])),
      matches: new Set([
        ...matchesA.map((row) => row.userBId),
        ...matchesB.map((row) => row.userAId),
      ]),
    };
  }

  async getMyProfile(userId: string) {
    const row = await this.prisma.datingProfile.findUnique({
      where: { userId },
      select: {
        ...datingProfileSelect,
        user: { select: userCardSelect },
      },
    });
    if (!row) {
      return { profile: null };
    }
    return {
      profile: {
        ...row,
        interests: interestsFromJson(row.interests),
        photoUrls: profilePhotoUrls(row),
      },
    };
  }

  async upsertMyProfile(userId: string, dto: UpsertDatingProfileDto) {
    const interests =
      dto.interests === undefined
        ? undefined
        : (dto.interests as unknown as Prisma.InputJsonValue);
    const photoUrls = normalizePhotoUrls(dto.photoUrls);

    const data: Prisma.DatingProfileUncheckedUpdateInput = {};
    if (dto.datingName !== undefined) {
      data.datingName = dto.datingName.trim() || null;
    }
    if (dto.age !== undefined) {
      data.age = dto.age;
    }
    if (dto.gender !== undefined) {
      data.gender = dto.gender.trim() || null;
    }
    if (dto.headline !== undefined) {
      data.headline = dto.headline.trim() || null;
    }
    if (dto.datingBio !== undefined) {
      data.datingBio = dto.datingBio.trim() || null;
    }
    if (interests !== undefined) {
      data.interests = interests;
    }
    if (dto.photoUrl !== undefined) {
      data.photoUrl = dto.photoUrl.trim() || null;
    }
    if (photoUrls !== undefined) {
      data.photoUrls = photoUrls;
      data.photoUrl = photoUrls[0] ?? null;
    }
    if (dto.minAgePref !== undefined) {
      data.minAgePref = dto.minAgePref;
    }
    if (dto.maxAgePref !== undefined) {
      data.maxAgePref = dto.maxAgePref;
    }
    if (dto.seekGender !== undefined) {
      data.seekGender = dto.seekGender.trim() || 'any';
    }
    if (dto.isDiscoverable !== undefined) {
      data.isDiscoverable = dto.isDiscoverable;
    }

    const row = await this.prisma.datingProfile.upsert({
      where: { userId },
      create: {
        userId,
        datingName: dto.datingName?.trim() || null,
        age: dto.age ?? null,
        gender: dto.gender?.trim() || null,
        headline: dto.headline?.trim() || null,
        datingBio: dto.datingBio?.trim() || null,
        interests: interests ?? Prisma.JsonNull,
        photoUrl: photoUrls?.[0] ?? (dto.photoUrl?.trim() || null),
        photoUrls:
          photoUrls ?? (dto.photoUrl?.trim() ? [dto.photoUrl.trim()] : []),
        minAgePref: dto.minAgePref ?? 18,
        maxAgePref: dto.maxAgePref ?? 99,
        seekGender: dto.seekGender?.trim() || 'any',
        isDiscoverable: dto.isDiscoverable ?? true,
      },
      update: data,
      select: {
        ...datingProfileSelect,
        user: { select: userCardSelect },
      },
    });

    return {
      profile: {
        ...row,
        interests: interestsFromJson(row.interests),
        photoUrls: profilePhotoUrls(row),
      },
    };
  }

  private reciprocalPrefFilter(mine: {
    age: number | null;
    gender: string | null;
  }): Prisma.DatingProfileWhereInput {
    const parts: Prisma.DatingProfileWhereInput[] = [];
    if (mine.gender?.trim()) {
      const g = mine.gender.trim();
      parts.push({
        OR: [{ seekGender: 'any' }, { seekGender: g }],
      });
    }
    if (mine.age != null) {
      parts.push({
        minAgePref: { lte: mine.age },
        maxAgePref: { gte: mine.age },
      });
    }
    if (parts.length === 0) {
      return {};
    }
    return { AND: parts };
  }

  private async createMatchNotifications(
    userAId: string,
    userBId: string,
    userA: { displayName: string | null; username: string },
    userB: { displayName: string | null; username: string },
  ) {
    const labelA = userA.displayName?.trim() || userA.username;
    const labelB = userB.displayName?.trim() || userB.username;
    const pairs: Array<{ userId: string; peerLabel: string }> = [
      { userId: userAId, peerLabel: labelB },
      { userId: userBId, peerLabel: labelA },
    ];
    for (const { userId, peerLabel } of pairs) {
      await this.prisma.notification
        .create({
          data: {
            userId,
            title: 'New dating match',
            body: `You matched with ${peerLabel}. Open Dating to say hi.`,
            href: '/app/dating?panel=inbox',
          },
        })
        .catch(() => undefined);
      await this.emitNotificationState(userId, 'dating_match');
    }
  }

  async discover(
    viewerId: string,
    query: {
      minAge?: number;
      maxAge?: number;
      gender?: string;
      country?: string;
      search?: string;
      take?: number;
      skip?: number;
    },
  ) {
    const mine = await this.prisma.datingProfile.findUnique({
      where: { userId: viewerId },
    });
    if (!mine) {
      throw new ForbiddenException(
        'Create your dating profile before browsing discover.',
      );
    }

    const take = Math.min(50, Math.max(1, query.take ?? 24));
    const skip = Math.max(0, query.skip ?? 0);
    const exclusion = await this.datingExclusionIds(viewerId);
    const notIn = [...exclusion];

    const minAge = query.minAge ?? mine.minAgePref;
    const maxAge = query.maxAge ?? mine.maxAgePref;
    const ageFilter: Prisma.IntFilter = {
      gte: minAge,
      lte: maxAge,
    };

    const genderFilter =
      query.gender && query.gender !== 'any'
        ? query.gender
        : mine.seekGender && mine.seekGender !== 'any'
          ? mine.seekGender
          : undefined;

    const countryFilter =
      query.country && query.country.trim() && query.country !== 'all'
        ? query.country.trim()
        : undefined;

    const search = query.search?.trim();

    const rows = await this.prisma.datingProfile.findMany({
      where: {
        userId: { notIn },
        isDiscoverable: true,
        age: ageFilter,
        ...(genderFilter ? { gender: genderFilter } : {}),
        ...(search
          ? {
              OR: [
                { datingName: { contains: search, mode: 'insensitive' } },
                {
                  user: { username: { contains: search, mode: 'insensitive' } },
                },
                {
                  user: {
                    displayName: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
        ...this.reciprocalPrefFilter(mine),
        user: {
          ...(countryFilter ? { country: countryFilter } : {}),
        },
      },
      select: {
        ...datingProfileSelect,
        user: { select: userCardSelect },
      },
      orderBy: [{ updatedAt: 'desc' }, { userId: 'desc' }],
      take,
      skip,
    });

    const viewerState = await this.viewerDatingState(
      viewerId,
      rows.map((row) => row.userId),
    );

    return {
      items: rows.map((row) => ({
        ...row,
        interests: interestsFromJson(row.interests),
        photoUrls: profilePhotoUrls(row),
        viewerSwipeAction: viewerState.swipes.get(row.userId) ?? null,
        isMatched: viewerState.matches.has(row.userId),
      })),
      hasMore: rows.length === take,
    };
  }

  async listLikesReceived(userId: string) {
    const mine = await this.prisma.datingProfile.findUnique({
      where: { userId },
    });
    if (!mine) {
      throw new ForbiddenException('Create your dating profile first.');
    }

    const [inbound, mySwipes, matchesA, matchesB] = await Promise.all([
      this.prisma.datingSwipe.findMany({
        where: { toUserId: userId, action: DatingSwipeAction.LIKE },
        select: { fromUserId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.datingSwipe.findMany({
        where: { fromUserId: userId },
        select: { toUserId: true },
      }),
      this.prisma.datingMatch.findMany({
        where: { userAId: userId },
        select: { userBId: true },
      }),
      this.prisma.datingMatch.findMany({
        where: { userBId: userId },
        select: { userAId: true },
      }),
    ]);

    const blocked = await this.blockedUserIds(userId);
    const responded = new Set(mySwipes.map((s) => s.toUserId));
    const matched = new Set([
      ...matchesA.map((m) => m.userBId),
      ...matchesB.map((m) => m.userAId),
    ]);

    const candidateIds = [
      ...new Set(
        inbound
          .map((s) => s.fromUserId)
          .filter(
            (id) =>
              !responded.has(id) &&
              !matched.has(id) &&
              !blocked.has(id) &&
              id !== userId,
          ),
      ),
    ];

    if (candidateIds.length === 0) {
      return { items: [] };
    }

    const profiles = await this.prisma.datingProfile.findMany({
      where: {
        userId: { in: candidateIds },
        isDiscoverable: true,
      },
      select: {
        ...datingProfileSelect,
        user: { select: userCardSelect },
      },
    });

    const byUserId = new Map(profiles.map((p) => [p.userId, p]));
    const items = candidateIds
      .map((id) => byUserId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((row) => ({
        ...row,
        interests: interestsFromJson(row.interests),
        photoUrls: profilePhotoUrls(row),
      }));

    return { items };
  }

  async listLikesSent(userId: string) {
    const mine = await this.prisma.datingProfile.findUnique({
      where: { userId },
    });
    if (!mine) {
      throw new ForbiddenException('Create your dating profile first.');
    }

    const liked = await this.prisma.datingSwipe.findMany({
      where: { fromUserId: userId, action: DatingSwipeAction.LIKE },
      select: { toUserId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const blocked = await this.blockedUserIds(userId);
    const candidateIds = [
      ...new Set(
        liked
          .map((row) => row.toUserId)
          .filter((id) => !blocked.has(id) && id !== userId),
      ),
    ];

    if (candidateIds.length === 0) {
      return { items: [] };
    }

    const profiles = await this.prisma.datingProfile.findMany({
      where: {
        userId: { in: candidateIds },
        isDiscoverable: true,
      },
      select: {
        ...datingProfileSelect,
        user: { select: userCardSelect },
      },
    });
    const viewerState = await this.viewerDatingState(userId, candidateIds);
    const byUserId = new Map(
      profiles.map((profile) => [profile.userId, profile]),
    );

    return {
      items: candidateIds
        .map((id) => byUserId.get(id))
        .filter((profile): profile is NonNullable<typeof profile> =>
          Boolean(profile),
        )
        .map((row) => ({
          ...row,
          interests: interestsFromJson(row.interests),
          photoUrls: profilePhotoUrls(row),
          viewerSwipeAction: viewerState.swipes.get(row.userId) ?? null,
          isMatched: viewerState.matches.has(row.userId),
        })),
    };
  }

  async getSummary(userId: string) {
    const [profile, matchCount] = await Promise.all([
      this.prisma.datingProfile.findUnique({
        where: { userId },
        select: { isDiscoverable: true },
      }),
      this.prisma.datingMatch.count({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
      }),
    ]);

    let likesReceivedCount = 0;
    let preview: Array<{
      userId: string;
      datingName: string | null;
      photoUrl: string | null;
      photoUrls: string[];
      avatarUrl: string | null;
      displayName: string | null;
      username: string;
    }> = [];

    if (profile) {
      const likes = await this.listLikesReceived(userId).catch(() => ({
        items: [],
      }));
      likesReceivedCount = likes.items.length;
      if (profile.isDiscoverable) {
        try {
          const { items } = await this.discover(userId, { take: 4, skip: 0 });
          preview = items.map((item) => ({
            userId: item.userId,
            datingName: item.datingName,
            photoUrl: item.photoUrl,
            photoUrls: profilePhotoUrls(item),
            avatarUrl: item.user.avatarUrl,
            displayName: item.user.displayName,
            username: item.user.username,
          }));
        } catch {
          preview = [];
        }
      }
    }

    return {
      hasProfile: Boolean(profile),
      isDiscoverable: profile?.isDiscoverable ?? false,
      matchCount,
      likesReceivedCount,
      preview,
    };
  }

  async swipe(viewerId: string, dto: DatingSwipeDto) {
    if (viewerId === dto.toUserId) {
      throw new ForbiddenException('You cannot swipe on yourself.');
    }

    const targetProfile = await this.prisma.datingProfile.findUnique({
      where: { userId: dto.toUserId },
    });
    if (!targetProfile?.isDiscoverable) {
      throw new NotFoundException('Profile is not available.');
    }

    const blocked = await this.blockedUserIds(viewerId);
    if (blocked.has(dto.toUserId)) {
      throw new ForbiddenException('You cannot interact with this user.');
    }

    await this.prisma.datingSwipe.upsert({
      where: {
        fromUserId_toUserId: { fromUserId: viewerId, toUserId: dto.toUserId },
      },
      create: {
        fromUserId: viewerId,
        toUserId: dto.toUserId,
        action: dto.action,
      },
      update: { action: dto.action },
    });

    if (dto.action !== DatingSwipeAction.LIKE) {
      const [userAId, userBId] = orderedPair(viewerId, dto.toUserId);
      const match = await this.prisma.datingMatch.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
        select: { id: true },
      });
      if (match) {
        await this.prisma.datingMatch.delete({ where: { id: match.id } });
        const payload = { matchId: match.id };
        this.realtimeEvents.emitToUser(viewerId, 'dating:unmatch', payload);
        this.realtimeEvents.emitToUser(dto.toUserId, 'dating:unmatch', payload);
      }
      return { matched: false, match: null };
    }

    const reciprocal = await this.prisma.datingSwipe.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: dto.toUserId, toUserId: viewerId },
      },
    });

    if (reciprocal?.action !== DatingSwipeAction.LIKE) {
      return { matched: false, match: null };
    }

    const [userAId, userBId] = orderedPair(viewerId, dto.toUserId);
    const match = await this.prisma.datingMatch.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
      include: {
        userA: {
          select: {
            ...userCardSelect,
            datingProfile: { select: datingProfileSelect },
          },
        },
        userB: {
          select: {
            ...userCardSelect,
            datingProfile: { select: datingProfileSelect },
          },
        },
      },
    });

    const payloadA = this.serializeMatchSocket(match, match.userAId);
    const payloadB = this.serializeMatchSocket(match, match.userBId);
    this.realtimeEvents.emitToUser(match.userAId, 'dating:match', payloadA);
    this.realtimeEvents.emitToUser(match.userBId, 'dating:match', payloadB);
    await this.createMatchNotifications(
      match.userAId,
      match.userBId,
      match.userA,
      match.userB,
    );

    return {
      matched: true,
      match: {
        id: match.id,
        createdAt: match.createdAt,
        peer:
          viewerId === match.userAId
            ? this.serializePeer(match.userB)
            : this.serializePeer(match.userA),
      },
    };
  }

  async deleteSwipe(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) {
      throw new ForbiddenException(
        'You cannot update dating interest for yourself.',
      );
    }

    const [userAId, userBId] = orderedPair(viewerId, targetUserId);
    const match = await this.prisma.datingMatch.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.datingSwipe.deleteMany({
        where: { fromUserId: viewerId, toUserId: targetUserId },
      }),
      this.prisma.datingMatch.deleteMany({
        where: { userAId, userBId },
      }),
    ]);

    if (match) {
      const payload = { matchId: match.id };
      this.realtimeEvents.emitToUser(viewerId, 'dating:unmatch', payload);
      this.realtimeEvents.emitToUser(targetUserId, 'dating:unmatch', payload);
    }

    return { ok: true };
  }

  private serializePeer(user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    country: string | null;
    bio: string | null;
    datingProfile: {
      age: number | null;
      datingName: string | null;
      gender: string | null;
      headline: string | null;
      datingBio: string | null;
      interests: Prisma.JsonValue | null;
      photoUrl: string | null;
      photoUrls: string[];
    } | null;
  }) {
    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        country: user.country,
        bio: user.bio,
      },
      dating: user.datingProfile
        ? {
            age: user.datingProfile.age,
            datingName: user.datingProfile.datingName,
            gender: user.datingProfile.gender,
            headline: user.datingProfile.headline,
            datingBio: user.datingProfile.datingBio,
            interests: interestsFromJson(user.datingProfile.interests),
            photoUrl: user.datingProfile.photoUrl,
            photoUrls: profilePhotoUrls(user.datingProfile),
          }
        : null,
    };
  }

  private serializeMatchSocket(
    match: {
      id: string;
      createdAt: Date;
      userAId: string;
      userBId: string;
      userA: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        country: string | null;
        bio: string | null;
        datingProfile: {
          age: number | null;
          datingName: string | null;
          gender: string | null;
          headline: string | null;
          datingBio: string | null;
          interests: Prisma.JsonValue | null;
          photoUrl: string | null;
          photoUrls: string[];
        } | null;
      };
      userB: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        country: string | null;
        bio: string | null;
        datingProfile: {
          age: number | null;
          datingName: string | null;
          gender: string | null;
          headline: string | null;
          datingBio: string | null;
          interests: Prisma.JsonValue | null;
          photoUrl: string | null;
          photoUrls: string[];
        } | null;
      };
    },
    forUserId: string,
  ) {
    const peer = forUserId === match.userAId ? match.userB : match.userA;
    return {
      matchId: match.id,
      createdAt: match.createdAt.toISOString(),
      peer: this.serializePeer(peer),
    };
  }

  async listMatches(userId: string) {
    const rows = await this.prisma.datingMatch.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        userA: {
          select: {
            ...userCardSelect,
            datingProfile: { select: datingProfileSelect },
          },
        },
        userB: {
          select: {
            ...userCardSelect,
            datingProfile: { select: datingProfileSelect },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
    });

    return {
      matches: rows.map((m) => {
        const peer = m.userAId === userId ? m.userB : m.userA;
        const last = m.messages[0] ?? null;
        return {
          id: m.id,
          createdAt: m.createdAt,
          peer: this.serializePeer(peer),
          lastMessage: last
            ? {
                id: last.id,
                body: last.body,
                createdAt: last.createdAt,
                senderId: last.senderId,
              }
            : null,
        };
      }),
    };
  }

  async assertMatchParticipant(userId: string, matchId: string) {
    const match = await this.prisma.datingMatch.findUnique({
      where: { id: matchId },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!match) {
      throw new NotFoundException('Match not found.');
    }
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Not a participant in this match.');
    }
    const peerId = match.userAId === userId ? match.userBId : match.userAId;
    return { match, peerId };
  }

  async deleteMatch(userId: string, matchId: string) {
    const { peerId } = await this.assertMatchParticipant(userId, matchId);
    await this.prisma.datingMatch.delete({ where: { id: matchId } });
    const payload = { matchId };
    this.realtimeEvents.emitToUser(userId, 'dating:unmatch', payload);
    this.realtimeEvents.emitToUser(peerId, 'dating:unmatch', payload);
    return { ok: true };
  }

  async listMessages(userId: string, matchId: string, take: number) {
    await this.assertMatchParticipant(userId, matchId);
    const limit = Math.min(200, Math.max(1, take));
    const rows = await this.prisma.datingMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: datingMessageSelect,
    });
    return {
      messages: [...rows].reverse().map((m) => ({
        id: m.id,
        kind: m.kind,
        body: m.body,
        createdAt: m.createdAt,
        senderId: m.senderId,
        attachments: m.attachments,
        sender: m.sender,
      })),
    };
  }

  async sendMessage(
    userId: string,
    matchId: string,
    dto: CreateDatingMessageDto,
  ) {
    const { peerId } = await this.assertMatchParticipant(userId, matchId);
    const trimmedBody = (dto.body ?? '').trim();
    const safeAttachments = sanitizeChatAttachments(dto.attachments);
    if (!trimmedBody && safeAttachments.length === 0) {
      throw new ForbiddenException(
        'A message needs text or at least one attachment',
      );
    }
    const message = await this.prisma.datingMessage.create({
      data: {
        matchId,
        senderId: userId,
        body: trimmedBody,
        kind: deriveMessageKind(trimmedBody, safeAttachments),
        attachments: safeAttachments.length
          ? { create: safeAttachments }
          : undefined,
      },
      select: datingMessageSelect,
    });

    const socketPayload = { matchId, message };
    this.realtimeEvents.emitToUser(userId, 'dating:message', socketPayload);
    this.realtimeEvents.emitToUser(peerId, 'dating:message', socketPayload);
    const senderName =
      message.sender.displayName?.trim() || message.sender.username || 'Someone';
    const preview = message.body.trim()
      ? message.body.slice(0, 120)
      : message.kind === 'VOICE'
        ? 'sent a voice message'
        : 'sent an attachment';
    await this.prisma.notification
      .create({
        data: {
          userId: peerId,
          title: 'New dating message',
          body: `${senderName}: ${preview}`,
          href: `/app/dating?panel=inbox&match=${encodeURIComponent(matchId)}`,
        },
      })
      .catch(() => undefined);
    await this.emitNotificationState(peerId, 'dating_message');

    return { message };
  }

  async getUserCard(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) {
      return this.getMyProfile(viewerId);
    }

    const blocked = await this.blockedUserIds(viewerId);
    if (blocked.has(targetUserId)) {
      throw new NotFoundException('Profile not found.');
    }

    const profile = await this.prisma.datingProfile.findUnique({
      where: { userId: targetUserId },
      select: {
        ...datingProfileSelect,
        user: { select: userCardSelect },
      },
    });
    if (!profile) {
      throw new NotFoundException('Profile not found.');
    }

    const isMatch = await this.prisma.datingMatch.findFirst({
      where: {
        OR: [
          { userAId: viewerId, userBId: targetUserId },
          { userAId: targetUserId, userBId: viewerId },
        ],
      },
      select: { id: true },
    });

    if (!profile.isDiscoverable && !isMatch) {
      throw new NotFoundException('Profile not found.');
    }

    return {
      profile: {
        ...profile,
        interests: interestsFromJson(profile.interests),
        photoUrls: profilePhotoUrls(profile),
      },
    };
  }

  emitTyping(
    viewerId: string,
    matchId: string,
    peerId: string,
    typing: boolean,
  ) {
    this.realtimeEvents.emitToUser(peerId, 'dating:typing', {
      matchId,
      userId: viewerId,
      typing,
    });
  }
}
