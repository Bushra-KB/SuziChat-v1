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
import { RealtimeStateService } from '../realtime/realtime-state.service';
import { ConversationsService } from './conversations.service';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';

@Controller('v1/conversations')
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly realtimeState: RealtimeStateService,
  ) {}

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

  @Get('peers/:peerId')
  getPeer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('peerId') peerId: string,
  ) {
    return this.conversationsService.getPeer(user.id, peerId);
  }

  @Patch('messages/:messageId')
  updateMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: SendDirectMessageDto,
  ) {
    return this.conversationsService
      .updateMessage(user.id, messageId, dto.body ?? '')
      .then((message) => {
        this.realtimeEvents.emitToUser(
          message.sender.id,
          'dm:message:updated',
          message,
        );
        this.realtimeEvents.emitToUser(
          message.recipient.id,
          'dm:message:updated',
          message,
        );
        void Promise.all([
          this.realtimeState.buildUserState(message.sender.id).then((state) => {
            this.realtimeEvents.emitToUser(
              message.sender.id,
              'realtime:state',
              state,
            );
          }),
          this.realtimeState
            .buildUserState(message.recipient.id)
            .then((state) => {
              this.realtimeEvents.emitToUser(
                message.recipient.id,
                'realtime:state',
                state,
              );
            }),
        ]);
        return message;
      });
  }

  @Delete('messages/:messageId')
  deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
  ) {
    return this.conversationsService
      .deleteMessage(user.id, messageId)
      .then((message) => {
        const payload = {
          messageId: message.id,
          senderId: message.senderId,
          recipientId: message.recipientId,
        };
        this.realtimeEvents.emitToUser(
          message.senderId,
          'dm:message:deleted',
          payload,
        );
        this.realtimeEvents.emitToUser(
          message.recipientId,
          'dm:message:deleted',
          payload,
        );
        void Promise.all([
          this.realtimeState.buildUserState(message.senderId).then((state) => {
            this.realtimeEvents.emitToUser(
              message.senderId,
              'realtime:state',
              state,
            );
          }),
          this.realtimeState
            .buildUserState(message.recipientId)
            .then((state) => {
              this.realtimeEvents.emitToUser(
                message.recipientId,
                'realtime:state',
                state,
              );
            }),
        ]);
        return payload;
      });
  }

  @Delete(':peerId')
  removeConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('peerId') peerId: string,
  ) {
    return this.conversationsService
      .removeConversation(user.id, peerId)
      .then((state) => {
        this.realtimeEvents.emitToUser(
          user.id,
          'dm:conversation:removed',
          state,
        );
        void this.realtimeState.buildUserState(user.id).then((nextState) => {
          this.realtimeEvents.emitToUser(user.id, 'realtime:state', nextState);
        });
        return state;
      });
  }

  @Post(':peerId/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('peerId') peerId: string,
    @Body() dto: SendDirectMessageDto,
  ) {
    return this.conversationsService
      .sendMessage(user.id, peerId, dto.body ?? '', dto.attachments)
      .then((message) => {
        this.realtimeEvents.emitToUser(
          message.sender.id,
          'dm:message',
          message,
        );
        this.realtimeEvents.emitToUser(
          message.recipient.id,
          'dm:message',
          message,
        );
        void Promise.all([
          this.realtimeState.buildUserState(message.sender.id).then((state) => {
            this.realtimeEvents.emitToUser(
              message.sender.id,
              'realtime:state',
              state,
            );
          }),
          this.realtimeState
            .buildUserState(message.recipient.id)
            .then((state) => {
              this.realtimeEvents.emitToUser(
                message.recipient.id,
                'realtime:state',
                state,
              );
            }),
        ]);
        return message;
      });
  }
}
