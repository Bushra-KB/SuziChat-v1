import { MoveKind } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';

export class GameActionDto {
  @IsOptional()
  @IsEnum(MoveKind)
  kind?: MoveKind;

  @IsObject()
  payload!: Record<string, unknown>;
}
