import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum RegisterGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export class RegisterDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  // Optional per App Store Guideline 5.1.1(v): birthday is not required to use
  // the app, so it must not be a required field. Age is gated by the explicit
  // 18+ confirmation checkbox (isAdultConfirmed) instead.
  @IsOptional()
  @IsDateString()
  birthday?: string;

  // Optional per App Store Guideline 5.1.1(v): gender is not essential to the
  // core functionality, so it must not be required.
  @IsOptional()
  @IsEnum(RegisterGender)
  gender?: RegisterGender;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsBoolean()
  isAdultConfirmed!: boolean;

  @IsBoolean()
  termsAccepted!: boolean;

  @IsBoolean()
  privacyAccepted!: boolean;
}
