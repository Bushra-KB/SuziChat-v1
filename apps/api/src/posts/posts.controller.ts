import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostKind } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('v1/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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

  @Get(':id')
  getPost(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(user.id, dto);
  }
}
