import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
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
