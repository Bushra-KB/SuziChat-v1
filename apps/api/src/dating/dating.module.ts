import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsModule } from '../realtime/realtime-events.module';
import { DatingController } from './dating.controller';
import { DatingService } from './dating.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeEventsModule],
  controllers: [DatingController],
  providers: [DatingService],
  exports: [DatingService],
})
export class DatingModule {}
