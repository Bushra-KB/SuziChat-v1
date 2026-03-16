import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userProfileSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
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
      },
      select: userProfileSelect,
    });

    return user;
  }
}
