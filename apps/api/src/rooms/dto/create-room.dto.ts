import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @Length(3, 64)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must use lowercase letters, numbers, and hyphens',
  })
  slug?: string;

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
  @Length(0, 200000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Public', 'Friends', 'Private'])
  privacy?: 'Public' | 'Friends' | 'Private';
}
