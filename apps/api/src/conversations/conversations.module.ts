import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsModule } from '../realtime/realtime-events.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeEventsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
