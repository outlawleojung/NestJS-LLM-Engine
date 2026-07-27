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

  @Post('copy')
  @UseGuards(SessionGuard)
  createCopy(@SessionId() sessionId: string, @Body() dto: CreateCopyDto) {
    return this.aiService.enqueueCopy(sessionId, dto);
  }

  @Post('qa')
  @UseGuards(SessionGuard)
  createQa(@SessionId() sessionId: string, @Body() dto: CreateQaDto) {
    return this.aiService.enqueueQa(sessionId, dto);
  }

  @Get('requests/:requestId')
  getRequest(@Param('requestId') requestId: string) {
    return this.aiService.findByRequestId(requestId);
  }

  @Get('usage')
  getUsage(@Query() query: UsageQueryDto) {
    return this.aiService.getUsage(query);
  }
}
