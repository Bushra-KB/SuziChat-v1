import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestStatus, Gender, PostKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userProfileSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  birthday: true,
  gender: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  country: true,
  role: true,
  isAdultConfirmed: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

type UserProfileRow = Prisma.UserGetPayload<{
  select: typeof userProfileSelect;
}>;

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim();
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async deleteMyAccount(userId: string) {
    // Removes the account and cascades to all of the user's data via the
    // Prisma relation onDelete rules (messages, posts, dating, games, rooms, …).
    await this.prisma.user
      .delete({ where: { id: userId } })
      .catch((error: { code?: string }) => {
        // Already deleted — treat as success (idempotent).
        if (error?.code !== 'P2025') {
          throw error;
        }
      });
    return { ok: true as const };
  }

  async updateMyProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });

    if (!current) {
      throw new NotFoundException('User profile not found');
    }

    const nextEmail =
      updateProfileDto.email !== undefined
        ? normalizeEmail(updateProfileDto.email)
        : undefined;
    const nextUsername =
      updateProfileDto.username !== undefined
        ? normalizeUsername(updateProfileDto.username)
        : undefined;

    if (nextEmail !== undefined && !nextEmail) {
      throw new BadRequestException('Email is required');
    }

    if (nextUsername !== undefined && nextUsername.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }

    if (
      updateProfileDto.birthday !== undefined &&
      Number.isNaN(new Date(updateProfileDto.birthday).getTime())
    ) {
      throw new BadRequestException('Birthday must be valid');
    }

    if (updateProfileDto.birthday !== undefined) {
      const birthday = new Date(updateProfileDto.birthday);
      const now = new Date();
      const minAdultDate = new Date(
        now.getFullYear() - 18,
        now.getMonth(),
        now.getDate(),
      );
      if (birthday > minAdultDate) {
        throw new BadRequestException('You must be at least 18 years old');
      }
    }

    if (nextEmail && nextEmail !== current.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });

      if (existingEmail) {
        throw new ConflictException('Email is already in use');
      }
    }

    if (nextUsername && nextUsername !== current.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: nextUsername },
        select: { id: true },
      });

      if (existingUsername) {
        throw new ConflictException('Username is already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: nextEmail,
        username: nextUsername,
        isEmailVerified:
          nextEmail && nextEmail !== current.email ? false : undefined,
        displayName:
          updateProfileDto.displayName !== undefined
            ? normalizeOptionalString(updateProfileDto.displayName)
            : undefined,
        firstName:
          updateProfileDto.firstName !== undefined
            ? normalizeOptionalString(normalizeName(updateProfileDto.firstName))
            : undefined,
        lastName:
          updateProfileDto.lastName !== undefined
            ? normalizeOptionalString(normalizeName(updateProfileDto.lastName))
            : undefined,
        birthday:
          updateProfileDto.birthday !== undefined
            ? new Date(updateProfileDto.birthday)
            : undefined,
        gender:
          updateProfileDto.gender !== undefined
            ? (updateProfileDto.gender as Gender)
            : undefined,
        bio:
          updateProfileDto.bio !== undefined
            ? normalizeOptionalString(updateProfileDto.bio)
            : undefined,
        country:
          updateProfileDto.country !== undefined
            ? normalizeOptionalString(updateProfileDto.country)
            : undefined,
        avatarUrl:
          updateProfileDto.avatarUrl !== undefined
            ? normalizeOptionalString(updateProfileDto.avatarUrl)
            : undefined,
      },
      select: userProfileSelect,
    });

    return user;
  }

  async setAvatarFromUploadUrl(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarUrl.trim() },
      select: userProfileSelect,
    });
  }

  async getProfileByUsername(viewerId: string, username: string) {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new NotFoundException('User profile not found');
    }
    /** Match stored casing (e.g. Bushra, Abebe Kebede); URLs often use different case. */
    const target = await this.prisma.user.findFirst({
      where: {
        username: { equals: trimmed, mode: 'insensitive' },
      },
      select: userProfileSelect,
    });

    if (!target) {
      throw new NotFoundException('User profile not found');
    }

    return this.buildUserProfileView(viewerId, target);
  }

  async getProfileByUserId(viewerId: string, userId: string) {
    const id = userId.trim();
    if (!id) {
      throw new NotFoundException('User profile not found');
    }

    const target = await this.prisma.user.findUnique({
      where: { id },
      select: userProfileSelect,
    });

    if (!target) {
      throw new NotFoundException('User profile not found');
    }

    return this.buildUserProfileView(viewerId, target);
  }

  private async buildUserProfileView(viewerId: string, target: UserProfileRow) {
    const isSelf = target.id === viewerId;
    const [
      friendship,
      outgoing,
      incoming,
      blockedByViewer,
      blockedViewer,
      friendsCount,
      roomsOwnedCount,
      snapsCount,
      reelsCount,
    ] = await Promise.all([
      this.prisma.friendship.findUnique({
        where: { userId_friendId: { userId: viewerId, friendId: target.id } },
        select: { createdAt: true },
      }),
      this.prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: { senderId: viewerId, receiverId: target.id },
        },
        select: { id: true, status: true, createdAt: true },
      }),
      this.prisma.friendRequest.findUnique({
        where: {
          senderId_receiverId: { senderId: target.id, receiverId: viewerId },
        },
        select: { id: true, status: true, createdAt: true },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: { blockerId: viewerId, blockedId: target.id },
        },
        select: { createdAt: true },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: { blockerId: target.id, blockedId: viewerId },
        },
        select: { createdAt: true },
      }),
      this.prisma.friendship.count({ where: { userId: target.id } }),
      this.prisma.room.count({ where: { ownerId: target.id } }),
      this.prisma.post.count({
        where: { authorId: target.id, kind: PostKind.SNAP },
      }),
      this.prisma.post.count({
        where: { authorId: target.id, kind: PostKind.REEL },
      }),
    ]);

    const relationship = isSelf
      ? { kind: 'self' as const }
      : blockedByViewer
        ? { kind: 'blocked_by_me' as const }
        : blockedViewer
          ? { kind: 'blocked_you' as const }
          : friendship
            ? {
                kind: 'friends' as const,
                friendsSince: friendship.createdAt,
              }
            : outgoing?.status === FriendRequestStatus.PENDING
              ? {
                  kind: 'outgoing_request' as const,
                  requestId: outgoing.id,
                  createdAt: outgoing.createdAt,
                }
              : incoming?.status === FriendRequestStatus.PENDING
                ? {
                    kind: 'incoming_request' as const,
                    requestId: incoming.id,
                    createdAt: incoming.createdAt,
                  }
                : { kind: 'none' as const };

    return {
      profile: target,
      relationship,
      counts: {
        friends: friendsCount,
        rooms: roomsOwnedCount,
        snaps: snapsCount,
        reels: reelsCount,
      },
    };
  }
}
