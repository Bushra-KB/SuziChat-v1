import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeEventsModule } from '../realtime/realtime-events.module';
import { GamesController } from './games.controller';
import { GamesMetricsService } from './games-metrics.service';
import { GamesService } from './games.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeEventsModule],
  controllers: [GamesController],
  providers: [GamesService, GamesMetricsService],
  exports: [GamesService, GamesMetricsService],
})
export class GamesModule {}
