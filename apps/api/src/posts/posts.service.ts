import { Injectable, NotFoundException } from '@nestjs/common';
import { PostKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPostById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        kind: true,
        mediaUrl: true,
        title: true,
        caption: true,
        visibility: true,
        createdAt: true,
        author: { select: authorSelect },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async listPosts(kind: PostKind, take = 40) {
    return this.prisma.post.findMany({
      where: { kind },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        kind: true,
        mediaUrl: true,
        title: true,
        caption: true,
        visibility: true,
        createdAt: true,
        author: { select: authorSelect },
      },
    });
  }

  async createPost(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        kind: dto.kind,
        mediaUrl: dto.mediaUrl.trim(),
        title: dto.title?.trim() ?? null,
        caption: dto.caption?.trim() ?? null,
        visibility: dto.visibility?.trim() ?? 'Public',
        authorId,
      },
      select: {
        id: true,
        kind: true,
        mediaUrl: true,
        title: true,
        caption: true,
        visibility: true,
        createdAt: true,
        author: { select: authorSelect },
      },
    });
  }
}
