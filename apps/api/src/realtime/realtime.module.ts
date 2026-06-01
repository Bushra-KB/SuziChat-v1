import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CallsModule } from '../calls/calls.module';
import { DatingModule } from '../dating/dating.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { PostsModule } from '../posts/posts.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GamesModule } from '../games/games.module';
import { RealtimeEventsModule } from './realtime-events.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    AuthModule,
    ConversationsModule,
    PostsModule,
    RoomsModule,
    GamesModule,
    RealtimeEventsModule,
    DatingModule,
    CallsModule,
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway, RealtimeEventsModule],
})
export class RealtimeModule {}
