import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  country: true,
  createdAt: true,
} as const;

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByUsername(username: string) {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new NotFoundException('User not found');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        username: { equals: trimmed, mode: 'insensitive' },
      },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
