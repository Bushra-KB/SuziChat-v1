import { PostKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsEnum(PostKind)
  kind!: PostKind;

  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  mediaUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  visibility?: string;
}
