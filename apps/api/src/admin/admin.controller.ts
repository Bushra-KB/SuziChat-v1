import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminService } from './admin.service';

@Controller('v1/admin')
@UseGuards(AccessTokenGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('moderation')
  moderation() {
    return this.adminService.moderationQueues();
  }

  @Get('audit-logs')
  listAuditLogs(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.adminService.listAuditLogs({ take, skip });
  }

  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listUsers({ search, role, take, skip });
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateUser(id, body, user.id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.deleteUser(id, user.id);
  }

  @Get('rooms')
  listRooms(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('privacy') privacy?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listRooms({
      search,
      category,
      privacy,
      take,
      skip,
    });
  }

  @Patch('rooms/:slug')
  updateRoom(
    @Param('slug') slug: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateRoom(slug, body, user.id);
  }

  @Delete('rooms/:slug')
  deleteRoom(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteRoom(slug, user.id);
  }

  @Get('room-categories')
  listRoomCategories() {
    return this.adminService.listRoomCategories();
  }

  @Post('room-categories')
  createRoomCategory(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.createRoomCategory(body, user.id);
  }

  @Patch('room-categories/:id')
  updateRoomCategory(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateRoomCategory(id, body, user.id);
  }

  @Delete('room-categories/:id')
  deleteRoomCategory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteRoomCategory(id, user.id);
  }

  @Get('room-messages')
  listRoomMessages(
    @Query('search') search?: string,
    @Query('roomId') roomId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listRoomMessages({ search, roomId, take, skip });
  }

  @Delete('room-messages/:id')
  deleteRoomMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteRoomMessage(id, user.id);
  }

  @Get('direct-messages')
  listDirectMessages(
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listDirectMessages({ search, take, skip });
  }

  @Delete('direct-messages/:id')
  deleteDirectMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteDirectMessage(id, user.id);
  }

  @Get('posts')
  listPosts(
    @Query('kind') kind?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listPosts({ kind, search, take, skip });
  }

  @Patch('posts/:id')
  updatePost(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updatePost(id, body, user.id);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.deletePost(id, user.id);
  }

  @Get('post-comments')
  listPostComments(
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listPostComments({ search, take, skip });
  }

  @Delete('post-comments/:id')
  deletePostComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deletePostComment(id, user.id);
  }

  @Get('games')
  listGames() {
    return this.adminService.listGames();
  }

  @Post('games/sessions/:id/close')
  closeGameSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.closeGameSession(id, user.id);
  }

  @Delete('games/lobbies/:id')
  deleteGameLobby(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteGameLobby(id, user.id);
  }

  @Get('dating')
  listDating() {
    return this.adminService.listDating();
  }

  @Patch('dating/profiles/:id')
  updateDatingProfile(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateDatingProfile(id, body, user.id);
  }

  @Delete('dating/profiles/:id')
  deleteDatingProfile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteDatingProfile(id, user.id);
  }

  @Delete('dating/matches/:id')
  deleteDatingMatch(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteDatingMatch(id, user.id);
  }

  @Get('notifications')
  listNotifications(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listNotifications({ take, skip });
  }

  @Post('notifications')
  createNotification(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.createNotification(body, user.id);
  }
}
