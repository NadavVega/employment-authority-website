import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticationRequiredException } from '../common/errors/api-exceptions';
import { IS_PUBLIC_ROUTE } from '../common/decorators/public.decorator';
import type { RequestWithContext } from '../common/logging/request-context';
import { AuthenticationService } from './authentication.service';

const BEARER_TOKEN = /^Bearer ([A-Za-z0-9._~-]+)$/;

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticationService: AuthenticationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.header('authorization');
    const match = authorization?.match(BEARER_TOKEN);
    if (!match?.[1]) {
      throw new AuthenticationRequiredException();
    }

    request.principal =
      await this.authenticationService.authenticateFirebaseToken(match[1]);
    return true;
  }
}
