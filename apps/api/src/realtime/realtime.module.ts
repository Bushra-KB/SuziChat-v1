import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { RoomsModule } from '../rooms/rooms.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, ConversationsModule, RoomsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
