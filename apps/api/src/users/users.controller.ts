import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AVATAR_UPLOAD_FIELD,
  AVATAR_UPLOAD_MAX_BYTES,
} from './avatar-upload.constants';
import {
  isAllowedAvatarImageFile,
  pickStoredAvatarExtension,
} from './avatar-upload.util';
import { UsersService } from './users.service';

@Controller('v1/users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  /** Prefer this for deep links: stable id, never confused with display names. */
  @Get('u/:userId/profile')
  getProfileByUserId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.usersService.getProfileByUserId(user.id, userId);
  }

  @Get(':username/profile')
  getProfileByUsername(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
  ) {
    return this.usersService.getProfileByUsername(user.id, username);
  }

  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateMyProfile(user.id, updateProfileDto);
  }

  @Post('me/profile/avatar')
  @UseInterceptors(
    FileInterceptor(AVATAR_UPLOAD_FIELD, {
      limits: { fileSize: AVATAR_UPLOAD_MAX_BYTES },
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          const dir = join(process.cwd(), 'uploads', 'avatars');
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
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.filename) {
      throw new BadRequestException('Image file is required.');
    }
    const avatarUrl = `/api/uploads/avatars/${file.filename}`;
    return this.usersService.setAvatarFromUploadUrl(user.id, avatarUrl);
  }
}
