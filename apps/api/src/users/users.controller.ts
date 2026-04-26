import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('v1/users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Get(':username/profile')
  getProfileByUsername(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
  ) {
    return this.usersService.getProfileByUsername(user.id, username);
  }

  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateMyProfile(user.id, updateProfileDto);
  }
}
