import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertDatingProfileDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  datingBio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(48, { each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4_000_000)
  photoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(120)
  minAgePref?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(120)
  maxAgePref?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  seekGender?: string;

  @IsOptional()
  @IsBoolean()
  isDiscoverable?: boolean;
}
