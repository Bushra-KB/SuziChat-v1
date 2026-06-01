import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsModule } from '../realtime/realtime-events.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeEventsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
