import type { Request } from 'express';

import type { ApplicationPrincipal } from '../../auth/application-principal';

export type RequestWithContext = Request & {
  requestId?: string;
  principal?: ApplicationPrincipal;
};
