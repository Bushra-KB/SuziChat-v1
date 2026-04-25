import { DatingSwipeAction } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class DatingSwipeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  toUserId!: string;

  @IsEnum(DatingSwipeAction)
  action!: DatingSwipeAction;
}
