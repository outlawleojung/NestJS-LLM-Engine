import { Body, Controller, Delete, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

import { CreateSessionDto } from './dto/create-session.dto';
import { SESSION_COOKIE } from './session.constants';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(204)
  async create(@Body() dto: CreateSessionDto, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sessionId = await this.sessionService.create({
      provider: dto.provider,
      llmApiKey: dto.llmApiKey,
      voyageApiKey: dto.voyageApiKey,
    });
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 1000,
    });
  }

  @Delete()
  @HttpCode(204)
  async destroy(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (sessionId) {
      await this.sessionService.destroy(sessionId);
    }
    res.clearCookie(SESSION_COOKIE);
  }
}
