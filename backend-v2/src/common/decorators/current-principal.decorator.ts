import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { ApplicationPrincipal } from '../../auth/application-principal';
import type { RequestWithContext } from '../logging/request-context';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ApplicationPrincipal => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.principal) {
      throw new Error('CurrentPrincipal used without an authenticated request');
    }
    return request.principal;
  },
);
