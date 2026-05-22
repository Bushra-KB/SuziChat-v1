import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import {
  AVATAR_UPLOAD_FIELD,
  AVATAR_UPLOAD_MAX_BYTES,
} from '../users/avatar-upload.constants';
import {
  isAllowedAvatarImageFile,
  pickStoredAvatarExtension,
} from '../users/avatar-upload.util';
import { CreateDatingMessageDto } from './dto/create-dating-message.dto';
import { DatingSwipeDto } from './dto/dating-swipe.dto';
import { UpsertDatingProfileDto } from './dto/upsert-dating-profile.dto';
import { DatingService } from './dating.service';

@Controller('v1/dating')
export class DatingController {
  constructor(private readonly datingService: DatingService) {}

  @Get('me/profile')
  @UseGuards(AccessTokenGuard)
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.datingService.getMyProfile(user.id);
  }

  @Put('me/profile')
  @UseGuards(AccessTokenGuard)
  upsertMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertDatingProfileDto,
  ) {
    return this.datingService.upsertMyProfile(user.id, dto);
  }

  @Post('me/profile/photos')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor(AVATAR_UPLOAD_FIELD, {
      limits: { fileSize: AVATAR_UPLOAD_MAX_BYTES },
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          const dir = join(process.cwd(), 'uploads', 'dating');
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req: Request, file: Express.Multer.File, cb) => {
          const ext = pickStoredAvatarExtension(
            file.mimetype,
            file.originalname,
          );
          if (!ext) {
            cb(new Error('Unsupported image type'), '');
            return;
          }
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (isAllowedAvatarImageFile(file.mimetype, file.originalname)) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            'Unsupported image. Use JPEG, PNG, WebP, or GIF.',
          ),
          false,
        );
      },
    }),
  )
  uploadDatingPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('Image file is required.');
    }
    return { url: `/api/uploads/dating/${file.filename}` };
  }

  @Get('summary')
  @UseGuards(AccessTokenGuard)
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.datingService.getSummary(user.id);
  }

  @Get('likes-received')
  @UseGuards(AccessTokenGuard)
  listLikesReceived(@CurrentUser() user: AuthenticatedUser) {
    return this.datingService.listLikesReceived(user.id);
  }

  @Get('likes-sent')
  @UseGuards(AccessTokenGuard)
  listLikesSent(@CurrentUser() user: AuthenticatedUser) {
    return this.datingService.listLikesSent(user.id);
  }

  @Get('discover')
  @UseGuards(AccessTokenGuard)
  discover(
    @CurrentUser() user: AuthenticatedUser,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query('gender') gender?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const parseIntOpt = (value?: string) => {
      if (value === undefined || value === '') {
        return undefined;
      }
      const n = Number.parseInt(value, 10);
      return Number.isFinite(n) ? n : undefined;
    };

    return this.datingService.discover(user.id, {
      minAge: parseIntOpt(minAge),
      maxAge: parseIntOpt(maxAge),
      gender,
      country,
      search,
      take: parseIntOpt(take),
      skip: parseIntOpt(skip),
    });
  }

  @Post('swipes')
  @UseGuards(AccessTokenGuard)
  swipe(@CurrentUser() user: AuthenticatedUser, @Body() dto: DatingSwipeDto) {
    return this.datingService.swipe(user.id, dto);
  }

  @Delete('swipes/:toUserId')
  @UseGuards(AccessTokenGuard)
  deleteSwipe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('toUserId') toUserId: string,
  ) {
    return this.datingService.deleteSwipe(user.id, toUserId);
  }

  @Get('matches')
  @UseGuards(AccessTokenGuard)
  listMatches(@CurrentUser() user: AuthenticatedUser) {
    return this.datingService.listMatches(user.id);
  }

  @Delete('matches/:matchId')
  @UseGuards(AccessTokenGuard)
  deleteMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchId') matchId: string,
  ) {
    return this.datingService.deleteMatch(user.id, matchId);
  }

  @Get('matches/:matchId/messages')
  @UseGuards(AccessTokenGuard)
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Query('take') take?: string,
  ) {
    const n = take ? Number.parseInt(take, 10) : 120;
    return this.datingService.listMessages(
      user.id,
      matchId,
      Number.isFinite(n) ? n : 120,
    );
  }

  @Post('matches/:matchId/messages')
  @UseGuards(AccessTokenGuard)
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchId') matchId: string,
    @Body() dto: CreateDatingMessageDto,
  ) {
    return this.datingService.sendMessage(user.id, matchId, dto);
  }

  @Get('users/:userId')
  @UseGuards(AccessTokenGuard)
  getUserCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.datingService.getUserCard(user.id, userId);
  }
}
