import { Controller, Get, Render, Req } from '@nestjs/common';
import { Request } from 'express';

import { SESSION_COOKIE } from '../session/session.constants';

@Controller()
export class ViewsController {
  @Get()
  @Render('index')
  index(@Req() req: Request) {
    const hasSession = Boolean(req.cookies?.[SESSION_COOKIE]);
    return { hasSession };
  }
}
