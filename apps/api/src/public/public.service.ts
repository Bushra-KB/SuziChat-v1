import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  country: true,
  createdAt: true,
} as const;

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByUsername(username: string) {
    const normalized = username.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { username: normalized },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
