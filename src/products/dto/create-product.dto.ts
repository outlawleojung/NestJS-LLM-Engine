import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: '무선 노이즈캔슬링 헤드폰' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '오디오/헤드폰' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @ApiProperty({
    example: '액티브 노이즈 캔슬링, 30시간 배터리, 블루투스 5.3, 40mm 드라이버',
  })
  @IsString()
  @IsNotEmpty()
  features!: string;
}
