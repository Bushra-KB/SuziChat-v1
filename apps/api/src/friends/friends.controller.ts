import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendsService } from './friends.service';

@Controller('v1/friends')
@UseGuards(AccessTokenGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.getSummary(user.id);
  }

  @Get('suggestions')
  getSuggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('take') take?: string,
  ) {
    const parsed = take ? Number.parseInt(take, 10) : 12;
    return this.friendsService.getSuggestions(
      user.id,
      Number.isFinite(parsed) ? Math.min(40, Math.max(1, parsed)) : 12,
    );
  }

  @Get('explore')
  exploreUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') query?: string,
    @Query('take') take?: string,
  ) {
    const parsed = take ? Number.parseInt(take, 10) : 24;
    return this.friendsService.exploreUsers(
      user.id,
      query ?? '',
      Number.isFinite(parsed) ? Math.min(60, Math.max(1, parsed)) : 24,
    );
  }

  @Get('blocked')
  listBlocked(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listBlockedUsers(user.id);
  }

  @Post('requests')
  sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() sendFriendRequestDto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(
      user.id,
      sendFriendRequestDto.usernameOrEmail,
    );
  }

  @Post('requests/:requestId/accept')
  acceptRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.acceptRequest(user.id, requestId);
  }

  @Post('requests/:requestId/decline')
  declineRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.declineRequest(user.id, requestId);
  }

  @Delete('requests/:requestId')
  cancelOutgoingRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.cancelOutgoingRequest(user.id, requestId);
  }

  @Post('blocked/:blockedId')
  blockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('blockedId') blockedId: string,
  ) {
    return this.friendsService.blockUser(user.id, blockedId);
  }

  @Delete('blocked/:blockedId')
  unblockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('blockedId') blockedId: string,
  ) {
    return this.friendsService.unblockUser(user.id, blockedId);
  }

  @Delete(':friendId')
  unfriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('friendId') friendId: string,
  ) {
    return this.friendsService.unfriend(user.id, friendId);
  }
}
