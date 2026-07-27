import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { SESSION_COOKIE } from './session.constants';
import { SessionService, UserKeys } from './session.service';

export interface RequestWithKeys extends Request {
  userKeys?: UserKeys;
  sessionId?: string;
}

/**
 * 쿠키에서 세션 ID를 읽어 Redis에서 사용자 키를 조회한 뒤 요청 객체에 부착.
 * 세션이 없거나 만료되었으면 401.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithKeys>();
    const sessionId = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sessionId) {
      throw new UnauthorizedException('No session. Set your API keys first (POST /session).');
    }
    const keys = await this.sessionService.get(sessionId).catch(() => null);
    if (!keys) {
      throw new UnauthorizedException('Session expired. Please set your API keys again.');
    }
    request.userKeys = keys;
    request.sessionId = sessionId;
    return true;
  }
}
