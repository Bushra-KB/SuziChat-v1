import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeStateService } from './realtime-state.service';

@Module({
  imports: [PrismaModule],
  providers: [RealtimeEventsService, RealtimeStateService],
  exports: [RealtimeEventsService, RealtimeStateService],
})
export class RealtimeEventsModule {}
