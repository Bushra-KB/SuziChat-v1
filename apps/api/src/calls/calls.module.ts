import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { DatingModule } from '../dating/dating.module';
import { RoomsModule } from '../rooms/rooms.module';
import { CallService } from './call.service';

@Module({
  imports: [ConversationsModule, DatingModule, RoomsModule],
  providers: [CallService],
  exports: [CallService],
})
export class CallsModule {}
