import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RtcController } from './rtc.controller';
import { RtcService } from './rtc.service';

@Module({
  imports: [AuthModule],
  controllers: [RtcController],
  providers: [RtcService],
})
export class RtcModule {}
