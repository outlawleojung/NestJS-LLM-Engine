import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { SessionId } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { AiService } from './ai.service';
import { CreateCopyDto } from './dto/create-copy.dto';
import { CreateQaDto } from './dto/create-qa.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 카피 생성 요청. requestId만 즉시 반환하고 실제 LLM 호출은 워커가 처리.
  @Post('copy')
  @UseGuards(SessionGuard)
  createCopy(@SessionId() sessionId: string, @Body() dto: CreateCopyDto) {
    return this.aiService.enqueueCopy(sessionId, dto);
  }

  // Q&A 요청. 워커에서 임베딩 → pgvector 검색 → LLM 답변 순으로 처리.
  @Post('qa')
  @UseGuards(SessionGuard)
  createQa(@SessionId() sessionId: string, @Body() dto: CreateQaDto) {
    return this.aiService.enqueueQa(sessionId, dto);
  }

  // 프런트에서 폴링하는 엔드포인트. status가 COMPLETED/FAILED가 될 때까지 반복 호출된다.
  @Get('requests/:requestId')
  getRequest(@Param('requestId') requestId: string) {
    return this.aiService.findByRequestId(requestId);
  }

  @Get('usage')
  getUsage(@Query() query: UsageQueryDto) {
    return this.aiService.getUsage(query);
  }
}
