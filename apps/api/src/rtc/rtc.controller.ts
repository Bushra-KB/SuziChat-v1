import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RtcService } from './rtc.service';

@Controller('v1/rtc')
@UseGuards(AccessTokenGuard)
export class RtcController {
  constructor(private readonly rtcService: RtcService) {}

  @Get('ice')
  getIceServers(@CurrentUser() user: AuthenticatedUser) {
    return this.rtcService.getIceServers(user.id);
  }
}
