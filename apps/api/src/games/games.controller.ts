import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GameType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateGameLobbyDto } from './dto/create-game-lobby.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinGameLobbyDto } from './dto/join-game-lobby.dto';
import { StartGameSessionDto } from './dto/start-game-session.dto';
import { GamesService } from './games.service';

@Controller('v1/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('catalog')
  listCatalog() {
    return this.gamesService.listCatalog();
  }

  @Get('lobbies')
  listLobbies(@Query('gameType') gameType?: GameType) {
    return this.gamesService.listLobbies(gameType);
  }

  @Get('lobbies/:lobbyId')
  @UseGuards(AccessTokenGuard)
  getLobby(@Param('lobbyId') lobbyId: string) {
    return this.gamesService.getLobby(lobbyId);
  }

  @Post('lobbies')
  @UseGuards(AccessTokenGuard)
  createLobby(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGameLobbyDto) {
    return this.gamesService.createLobby(user.id, dto);
  }

  @Post('lobbies/:lobbyId/join')
  @UseGuards(AccessTokenGuard)
  joinLobby(
    @Param('lobbyId') lobbyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinGameLobbyDto,
  ) {
    return this.gamesService.joinLobby(lobbyId, user.id, dto);
  }

  @Post('lobbies/:lobbyId/leave')
  @UseGuards(AccessTokenGuard)
  leaveLobby(@Param('lobbyId') lobbyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.gamesService.leaveLobby(lobbyId, user.id);
  }

  @Post('lobbies/:lobbyId/start')
  @UseGuards(AccessTokenGuard)
  startSession(
    @Param('lobbyId') lobbyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartGameSessionDto,
  ) {
    return this.gamesService.startSession(lobbyId, user.id, dto);
  }

  @Post('lobbies/:lobbyId/invite/:targetUserId')
  @UseGuards(AccessTokenGuard)
  inviteToLobby(
    @Param('lobbyId') lobbyId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gamesService.sendInvite(lobbyId, user.id, targetUserId);
  }

  @Get('sessions/:sessionId')
  @UseGuards(AccessTokenGuard)
  getSession(@Param('sessionId') sessionId: string) {
    return this.gamesService.getSession(sessionId);
  }

  @Post('sessions/:sessionId/action')
  @UseGuards(AccessTokenGuard)
  postAction(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GameActionDto,
  ) {
    return this.gamesService.postAction(sessionId, user.id, dto);
  }
}
