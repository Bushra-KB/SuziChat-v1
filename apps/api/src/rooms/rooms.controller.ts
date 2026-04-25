import {
  Body,
  Controller,
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
}
