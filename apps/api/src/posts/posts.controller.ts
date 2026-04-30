import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostKind } from '@prisma/client';
import type { Express } from 'express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { REEL_UPLOAD_FIELD, REEL_UPLOAD_MAX_BYTES } from './reel-upload.constants';
import { isAllowedReelVideoFile, pickStoredReelExtension } from './reel-upload.util';
import { PostsService } from './posts.service';

@Controller('v1/posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  @Get()
  listPosts(
    @Query('kind', new ParseEnumPipe(PostKind)) kind: PostKind,
    @Query('take') take?: string,
  ) {
    const n = take ? Number.parseInt(take, 10) : 40;
    return this.postsService.listPosts(
      kind,
      Number.isFinite(n) ? Math.min(80, Math.max(1, n)) : 40,
    );
  }

  @Get('me/list')
  @UseGuards(AccessTokenGuard)
  listPostsForMe(
    @CurrentUser() user: AuthenticatedUser,
    @Query('kind', new ParseEnumPipe(PostKind)) kind: PostKind,
    @Query('take') take?: string,
  ) {
    const n = take ? Number.parseInt(take, 10) : 40;
    return this.postsService.listPostsForUser(
      user.id,
      kind,
      Number.isFinite(n) ? Math.min(80, Math.max(1, n)) : 40,
    );
  }

  @Get(':id')
  getPost(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Post('upload/reel')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor(REEL_UPLOAD_FIELD, {
      limits: { fileSize: REEL_UPLOAD_MAX_BYTES },
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          const dir = join(process.cwd(), 'uploads', 'reels');
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req: Request, file: Express.Multer.File, cb) => {
          const ext = pickStoredReelExtension(file.mimetype, file.originalname);
          if (!ext) {
            cb(new Error('Unsupported video type'), '');
            return;
          }
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (isAllowedReelVideoFile(file.mimetype, file.originalname)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            'Unsupported video type. Use MP4, WebM, MOV, or another common format.',
          ),
          false,
        );
      },
    }),
  )
  uploadReel(@UploadedFile() file: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('Video file is required.');
    }
    return {
      mediaUrl: `/api/uploads/reels/${file.filename}`,
    };
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(user.id, dto);
  }

  @Get(':id/comments')
  @UseGuards(AccessTokenGuard)
  listComments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('take') take?: string,
  ) {
    const n = take ? Number.parseInt(take, 10) : 80;
    return this.postsService.listComments(
      id,
      user.id,
      Number.isFinite(n) ? Math.min(150, Math.max(1, n)) : 80,
    );
  }

  @Get(':id/engagement')
  @UseGuards(AccessTokenGuard)
  getEngagement(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.postsService.getEngagement(id, user.id);
  }

  @Post(':id/view')
  @UseGuards(AccessTokenGuard)
  async trackView(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const engagement = await this.postsService.trackView(id, user.id);
    this.realtimeEvents.emitToChannel(`post:${id}`, 'post:engagement', engagement);
    return engagement;
  }

  @Post(':id/like')
  @UseGuards(AccessTokenGuard)
  async toggleLike(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const engagement = await this.postsService.toggleLike(id, user.id);
    this.realtimeEvents.emitToChannel(`post:${id}`, 'post:engagement', engagement);
    return engagement;
  }

  @Post(':id/comments')
  @UseGuards(AccessTokenGuard)
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostCommentDto,
  ) {
    const created = await this.postsService.addComment(id, user.id, dto.body);
    this.realtimeEvents.emitToChannel(`post:${id}`, 'post:comment', {
      postId: id,
      comment: created.comment,
    });
    this.realtimeEvents.emitToChannel(`post:${id}`, 'post:engagement', created.engagement);
    return created;
  }
}
