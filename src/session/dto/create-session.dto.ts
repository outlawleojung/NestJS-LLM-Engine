import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  anthropicApiKey!: string;

  @IsString()
  @IsNotEmpty()
  voyageApiKey!: string;
}
