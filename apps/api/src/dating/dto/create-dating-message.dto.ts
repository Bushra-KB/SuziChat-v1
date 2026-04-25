import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDatingMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}
