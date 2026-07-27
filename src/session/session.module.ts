import { Module } from '@nestjs/common';

import { SessionController } from './session.controller';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Module({
  controllers: [SessionController],
  providers: [SessionService, SessionGuard],
  exports: [SessionService, SessionGuard],
})
export class SessionModule {}
