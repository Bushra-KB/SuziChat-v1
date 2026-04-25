import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsModule } from '../realtime/realtime-events.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeEventsModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
