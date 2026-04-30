import { Injectable, NotFoundException } from '@nestjs/common';
import { FriendRequestStatus, PostKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userProfileSelect = {
  id: true,
  email: true,
  username: true,
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

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

  async updateMyProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName:
          updateProfileDto.displayName !== undefined
            ? normalizeOptionalString(updateProfileDto.displayName)
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
    const normalized = username.trim().toLowerCase();
    const target = await this.prisma.user.findFirst({
      where: { username: normalized },
      select: userProfileSelect,
    });

    if (!target) {
      throw new NotFoundException('User profile not found');
    }

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
