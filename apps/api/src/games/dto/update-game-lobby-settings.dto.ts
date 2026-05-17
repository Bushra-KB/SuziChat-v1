import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateGameLobbySettingsDto {
  @IsOptional()
  @IsBoolean()
  allowSpectatorChat?: boolean;
}
