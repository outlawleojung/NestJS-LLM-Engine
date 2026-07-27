import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { RequestWithKeys } from './session.guard';
import { UserKeys } from './session.service';

export const SessionKeys = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserKeys => {
    const req = ctx.switchToHttp().getRequest<RequestWithKeys>();
    if (!req.userKeys) {
      throw new Error('SessionGuard must be applied before using @SessionKeys');
    }
    return req.userKeys;
  },
);

export const SessionId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<RequestWithKeys>();
  if (!req.sessionId) {
    throw new Error('SessionGuard must be applied before using @SessionId');
  }
  return req.sessionId;
});
