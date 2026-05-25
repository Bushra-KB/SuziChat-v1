import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  credential!: string;

  @IsOptional()
  @IsBoolean()
  isAdultConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;

  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;
}
