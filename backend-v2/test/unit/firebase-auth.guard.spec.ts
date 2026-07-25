import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticationService } from '../../src/auth/authentication.service';
import { FirebaseAuthGuard } from '../../src/auth/firebase-auth.guard';
import type { RequestWithContext } from '../../src/common/logging/request-context';

describe('FirebaseAuthGuard', () => {
  let authenticationService: Pick<
    AuthenticationService,
    'authenticateFirebaseToken'
  >;
  let guard: FirebaseAuthGuard;

  beforeEach(() => {
    authenticationService = {
      authenticateFirebaseToken: vi.fn(),
    };
    guard = new FirebaseAuthGuard(
      new Reflector(),
      authenticationService as AuthenticationService,
    );
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'Token not-a-bearer-token'],
  ])('rejects a %s authorization header', async (_case, authorization) => {
    const request = requestWithAuthorization(authorization);

    await expect(guard.canActivate(executionContext(request))).rejects.toMatchObject(
      {
        code: 'AUTHENTICATION_REQUIRED',
        status: 401,
      },
    );
    expect(
      authenticationService.authenticateFirebaseToken,
    ).not.toHaveBeenCalled();
  });
});

function requestWithAuthorization(
  authorization: string | undefined,
): RequestWithContext {
  return {
    header: vi.fn((name: string) =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
    ),
  } as unknown as RequestWithContext;
}

function executionContext(request: RequestWithContext): ExecutionContext {
  const handler = (): void => undefined;
  class TestController {}

  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
