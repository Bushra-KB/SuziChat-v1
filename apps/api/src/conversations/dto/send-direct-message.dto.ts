import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendDirectMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}
