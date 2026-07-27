import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQaDto {
  @ApiProperty({ example: '노이즈 캔슬링이 되는 30시간 배터리 헤드폰 추천해줘' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({
    example: 5,
    required: false,
    description: '검색할 유사 상품 개수 (top-K)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
