import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class JoinGameLobbyDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  seatIndex!: number;
}
