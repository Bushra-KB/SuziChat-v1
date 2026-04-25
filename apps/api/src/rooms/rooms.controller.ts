import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@Controller('v1/rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  private async emitRoomStats(slug: string) {
    const room = await this.roomsService.getRoomBySlug(slug);
    this.realtimeEvents.emitToChannel(`roomstats:${slug}`, 'room:stats', {
      roomSlug: slug,
      totalMembers: room._count?.memberships ?? 0,
    });
  }

  @Get()
  listRooms() {
    return this.roomsService.listRooms();
  }

  @Get('me/list')
  @UseGuards(AccessTokenGuard)
  listRoomsForMe(@CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.listRoomsForUser(user.id);
  }

  @Get('categories')
  listCategories() {
    return this.roomsService.listCategories();
  }

  @Get(':slug/messages')
  listMessages(@Param('slug') slug: string) {
    return this.roomsService.listMessages(slug);
  }

  @Get(':slug/me/access')
  @UseGuards(AccessTokenGuard)
  getMyAccess(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.getRoomAccess(slug, user.id);
  }

  @Get(':slug/me/messages')
  @UseGuards(AccessTokenGuard)
  listMessagesForMe(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.listMessagesForUser(slug, user.id);
  }

  @Get(':slug')
  getRoom(@Param('slug') slug: string) {
    return this.roomsService.getRoomBySlug(slug);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  createRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.createRoom(user.id, dto);
  }

  @Patch(':slug')
  @UseGuards(AccessTokenGuard)
  updateRoom(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.updateRoom(slug, user.id, dto);
  }

  @Delete(':slug')
  @UseGuards(AccessTokenGuard)
  deleteRoom(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.deleteRoom(slug, user.id);
  }

  @Post(':slug/messages')
  @UseGuards(AccessTokenGuard)
  postMessage(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomMessageDto,
  ) {
    return this.roomsService.postMessage(slug, user.id, dto.body).then((message) => {
      this.realtimeEvents.emitRoom(slug, 'room:message', { roomSlug: slug, message });
      return message;
    });
  }

  @Post(':slug/join')
  @UseGuards(AccessTokenGuard)
  async joinRoom(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.roomsService.joinRoom(slug, user.id);
    await this.emitRoomStats(slug);
    return result;
  }

  @Post(':slug/request-access')
  @UseGuards(AccessTokenGuard)
  async requestAccess(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.requestAccess(slug, user.id);
  }

  @Post(':slug/cancel-request')
  @UseGuards(AccessTokenGuard)
  async cancelJoinRequest(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.cancelJoinRequest(slug, user.id);
  }

  @Post(':slug/leave')
  @UseGuards(AccessTokenGuard)
  async leaveRoom(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.roomsService.leaveRoom(slug, user.id);
    await this.emitRoomStats(slug);
    return result;
  }

  @Get(':slug/manage')
  @UseGuards(AccessTokenGuard)
  getRoomManagement(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.getRoomManagement(slug, user.id);
  }

  @Post(':slug/manage/requests/:userId/approve')
  @UseGuards(AccessTokenGuard)
  approveJoinRequest(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.approveJoinRequest(slug, user.id, userId).then(async (result) => {
      await this.emitRoomStats(slug);
      return result;
    });
  }

  @Post(':slug/manage/requests/:userId/reject')
  @UseGuards(AccessTokenGuard)
  rejectJoinRequest(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.rejectJoinRequest(slug, user.id, userId);
  }

  @Post(':slug/manage/members/:userId/remove')
  @UseGuards(AccessTokenGuard)
  removeMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.removeMember(slug, user.id, userId).then(async (result) => {
      await this.emitRoomStats(slug);
      return result;
    });
  }

  @Post(':slug/manage/members/:userId/ban')
  @UseGuards(AccessTokenGuard)
  banMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.banMember(slug, user.id, userId).then(async (result) => {
      await this.emitRoomStats(slug);
      return result;
    });
  }

  @Post(':slug/manage/bans/:userId/unban')
  @UseGuards(AccessTokenGuard)
  unbanMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.unbanMember(slug, user.id, userId);
  }
}
