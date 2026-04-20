import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import { RoomsService } from './rooms.service';

@Controller('v1/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  listRooms() {
    return this.roomsService.listRooms();
  }

  @Get(':slug/messages')
  listMessages(@Param('slug') slug: string) {
    return this.roomsService.listMessages(slug);
  }

  @Get(':slug')
  getRoom(@Param('slug') slug: string) {
    return this.roomsService.getRoomBySlug(slug);
  }

  @Post(':slug/messages')
  @UseGuards(AccessTokenGuard)
  postMessage(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoomMessageDto,
  ) {
    return this.roomsService.postMessage(slug, user.id, dto.body);
  }
}
