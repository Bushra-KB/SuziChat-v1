import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsModule } from '../realtime/realtime-events.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeEventsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
