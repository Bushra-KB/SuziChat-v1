import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @Length(3, 64)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(2, 40)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 4_000_000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Public', 'Friends', 'Private'])
  privacy?: 'Public' | 'Friends' | 'Private';
}
