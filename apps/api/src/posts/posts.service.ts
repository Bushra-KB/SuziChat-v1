import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private async friendIdsFor(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ userId }, { friendId: userId }] },
      select: { userId: true, friendId: true },
    });
    const ids = new Set<string>();
    for (const row of rows) {
      if (row.userId === userId) {
        ids.add(row.friendId);
      } else {
        ids.add(row.userId);
      }
    }
    return [...ids];
  }

  private postSelect() {
    return {
      id: true,
      kind: true,
      mediaUrl: true,
      title: true,
      caption: true,
      visibility: true,
      createdAt: true,
      author: { select: authorSelect },
      _count: {
        select: {
          likes: true,
          comments: true,
          views: true,
        },
      },
    } as const;
  }

  async assertCanViewPost(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, visibility: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const vis = post.visibility.toLowerCase();
    if (vis === 'public') {
      return;
    }
    if (!viewerId) {
      throw new ForbiddenException('You are not allowed to view this post');
    }
    if (post.authorId === viewerId) {
      return;
    }
    if (vis === 'friends') {
      const friends = await this.friendIdsFor(viewerId);
      if (friends.includes(post.authorId)) {
        return;
      }
    }
    throw new ForbiddenException('You are not allowed to view this post');
  }

  async getPostById(id: string, viewerId?: string) {
    await this.assertCanViewPost(id, viewerId);
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: this.postSelect(),
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async listPosts(kind: PostKind, take = 40) {
    return this.prisma.post.findMany({
      where: {
        kind,
        visibility: { equals: 'Public', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: this.postSelect(),
    });
  }

  async listPostsForUser(userId: string, kind: PostKind, take = 40) {
    const friends = await this.friendIdsFor(userId);
    const friendFilter: Prisma.PostWhereInput[] = friends.map((fid) => ({
      AND: [
        { visibility: { equals: 'Friends', mode: 'insensitive' } },
        { authorId: fid },
      ],
    }));
    return this.prisma.post.findMany({
      where: {
        kind,
        OR: [
          { visibility: { equals: 'Public', mode: 'insensitive' } },
          { authorId: userId },
          ...friendFilter,
        ],
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: this.postSelect(),
    });
  }

  async listAuthoredPosts(authorId: string, kind: PostKind, take = 40) {
    return this.prisma.post.findMany({
      where: { kind, authorId },
      orderBy: { createdAt: 'desc' },
      take,
      select: this.postSelect(),
    });
  }

  /** Posts by a user visible on their profile to the signed-in viewer. */
  async listAuthorPostsForProfile(
    viewerId: string,
    authorId: string,
    kind: PostKind,
    take = 40,
  ) {
    if (viewerId === authorId) {
      return this.listAuthoredPosts(authorId, kind, take);
    }
    const friends = await this.friendIdsFor(viewerId);
    const isFriend = friends.includes(authorId);
    const visibilityOr: Prisma.PostWhereInput[] = [
      { visibility: { equals: 'Public', mode: 'insensitive' } },
    ];
    if (isFriend) {
      visibilityOr.push({
        visibility: { equals: 'Friends', mode: 'insensitive' },
      });
    }
    return this.prisma.post.findMany({
      where: {
        kind,
        authorId,
        OR: visibilityOr,
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: this.postSelect(),
    });
  }

  async deletePostAsAuthor(postId: string, authorId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, kind: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.post.delete({ where: { id: postId } });
    return { status: 'deleted' as const, id: postId, kind: post.kind };
  }

  private assertValidMediaUrl(mediaUrl: string) {
    const trimmed = mediaUrl.trim();
    if (!trimmed) {
      throw new BadRequestException('mediaUrl is required');
    }
    if (trimmed.startsWith('data:')) {
      throw new BadRequestException(
        'Embedded media is not supported. Upload the file first, then create the post.',
      );
    }
    if (trimmed.length > 12_000) {
      throw new BadRequestException(
        'mediaUrl is too long. Upload the image or video file instead of pasting large text.',
      );
    }
    return trimmed;
  }

  async createPost(authorId: string, dto: CreatePostDto) {
    const mediaUrl = this.assertValidMediaUrl(dto.mediaUrl);
    return this.prisma.post.create({
      data: {
        kind: dto.kind,
        mediaUrl,
        title: dto.title?.trim() ?? null,
        caption: dto.caption?.trim() ?? null,
        visibility: dto.visibility?.trim() ?? 'Public',
        authorId,
      },
      select: this.postSelect(),
    });
  }

  async trackView(postId: string, userId: string) {
    await this.assertCanViewPost(postId, userId);
    await this.prisma.postView.upsert({
      where: { postId_userId: { postId, userId } },
      update: { lastViewedAt: new Date() },
      create: { postId, userId },
    });
    return this.getEngagement(postId, userId);
  }

  async toggleLike(postId: string, userId: string) {
    await this.assertCanViewPost(postId, userId);
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      });
    } else {
      await this.prisma.postLike.create({
        data: { postId, userId },
      });
    }
    return this.getEngagement(postId, userId);
  }

  async listComments(postId: string, viewerId: string, take = 80) {
    await this.assertCanViewPost(postId, viewerId);
    return this.prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(150, Math.max(1, take)),
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: { select: authorSelect },
      },
    });
  }

  async addComment(postId: string, userId: string, body: string) {
    await this.assertCanViewPost(postId, userId);
    const trimmed = body.trim();
    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        userId,
        body: trimmed,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: { select: authorSelect },
      },
    });
    const engagement = await this.getEngagement(postId, userId);
    return { comment, engagement };
  }

  async getEngagement(postId: string, viewerId?: string) {
    await this.assertCanViewPost(postId, viewerId);
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        _count: { select: { likes: true, comments: true, views: true } },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    let likedByMe = false;
    if (viewerId) {
      const like = await this.prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId: viewerId } },
        select: { id: true },
      });
      likedByMe = Boolean(like);
    }
    return {
      postId,
      likes: post._count.likes,
      comments: post._count.comments,
      views: post._count.views,
      likedByMe,
    };
  }
}
