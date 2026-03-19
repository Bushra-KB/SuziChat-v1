import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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

  @Delete(':friendId')
  unfriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('friendId') friendId: string,
  ) {
    return this.friendsService.unfriend(user.id, friendId);
  }
}
