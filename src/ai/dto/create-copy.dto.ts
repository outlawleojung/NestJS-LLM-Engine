import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCopyDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;
}
