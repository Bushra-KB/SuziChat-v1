import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class StartGameSessionDto {
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  /** Cancel any active session for this lobby and start fresh. */
  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}
