import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { PostsModule } from '../posts/posts.module';
import { RoomsModule } from '../rooms/rooms.module';
import { RealtimeEventsModule } from './realtime-events.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, ConversationsModule, PostsModule, RoomsModule, RealtimeEventsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway, RealtimeEventsModule],
})
export class RealtimeModule {}
