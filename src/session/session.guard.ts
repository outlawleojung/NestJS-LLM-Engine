import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { SESSION_COOKIE } from './session.constants';
import { SessionService, UserKeys } from './session.service';

export interface RequestWithKeys extends Request {
  userKeys?: UserKeys;
  sessionId?: string;
}

// 쿠키의 sessionId로 세션을 조회해 request에 userKeys를 부착.
// 이후 컨트롤러는 @SessionKeys()/@SessionId() 데코레이터로 꺼낸다.
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
