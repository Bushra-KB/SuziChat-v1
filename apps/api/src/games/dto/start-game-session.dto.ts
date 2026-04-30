import { IsObject, IsOptional } from 'class-validator';

export class StartGameSessionDto {
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}
