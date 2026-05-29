import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
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

  @IsDateString()
  birthday!: string;

  @IsEnum(RegisterGender)
  gender!: RegisterGender;

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
