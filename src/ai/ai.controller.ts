import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { AiService } from './ai.service';
import { CreateCopyDto } from './dto/create-copy.dto';
import { CreateQaDto } from './dto/create-qa.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@ApiTags('ai')
@ApiSecurity('apiKey')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('copy')
  @ApiOperation({ summary: '상세페이지 카피 생성 요청 (비동기)' })
  createCopy(@Body() dto: CreateCopyDto) {
    return this.aiService.enqueueCopy(dto);
  }

  @Post('qa')
  @ApiOperation({ summary: 'RAG 기반 Q&A 요청 (비동기)' })
  createQa(@Body() dto: CreateQaDto) {
    return this.aiService.enqueueQa(dto);
  }

  @Get('requests/:requestId')
  @ApiOperation({ summary: 'AI 요청 상태·결과 조회' })
  getRequest(@Param('requestId') requestId: string) {
    return this.aiService.findByRequestId(requestId);
  }

  @Get('usage')
  @ApiOperation({ summary: '기간별 토큰 사용량 및 비용 조회' })
  getUsage(@Query() query: UsageQueryDto) {
    return this.aiService.getUsage(query);
  }
}
