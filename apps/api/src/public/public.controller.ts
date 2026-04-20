import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('v1/public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('users/:username')
  getUserByUsername(@Param('username') username: string) {
    return this.publicService.getUserByUsername(username);
  }
}
