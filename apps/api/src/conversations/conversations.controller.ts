import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { ConversationsService } from './conversations.service';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';

@Controller('v1/conversations')
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.listThreads(user.id);
  }

  @Get(':peerId/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('peerId') peerId: string,
  ) {
    return this.conversationsService.listMessages(user.id, peerId);
  }

  @Post(':peerId/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('peerId') peerId: string,
    @Body() dto: SendDirectMessageDto,
  ) {
    return this.conversationsService.sendMessage(user.id, peerId, dto.body);
  }
}
