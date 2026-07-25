import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationPrincipal } from '../../src/auth/application-principal';
import { AuthenticationService } from '../../src/auth/authentication.service';
import {
  InvalidFirebaseTokenError,
  type FirebaseTokenVerifier,
} from '../../src/auth/firebase-token-verifier';
import type { PrincipalRepository } from '../../src/auth/principal.repository';
import type { ApiException } from '../../src/common/errors/api.exception';

const principal: ApplicationPrincipal = {
  applicationUserId: 'fd1a9f46-0c1f-4db1-833b-0e6554473bd1',
  authProvider: 'firebase',
  authSubject: 'firebase-uid',
  roles: ['admin'],
};

describe('AuthenticationService', () => {
  let verifier: FirebaseTokenVerifier;
  let repository: Pick<PrincipalRepository, 'resolveFirebasePrincipal'>;
  let service: AuthenticationService;

  beforeEach(() => {
    verifier = {
      verifyIdToken: vi.fn(),
    };
    repository = {
      resolveFirebasePrincipal: vi.fn(),
    };
    service = new AuthenticationService(
      verifier,
      repository as PrincipalRepository,
    );
  });

  it('rejects an invalid Firebase ID token', async () => {
    vi.mocked(verifier.verifyIdToken).mockRejectedValue(
      new InvalidFirebaseTokenError(),
    );

    await expect(service.authenticateFirebaseToken('invalid')).rejects.toMatchObject(
      {
        code: 'AUTHENTICATION_REQUIRED',
        status: HttpStatus.UNAUTHORIZED,
      } satisfies Partial<ApiException>,
    );
  });

  it('rejects a valid Firebase identity without an active application mapping', async () => {
    vi.mocked(verifier.verifyIdToken).mockResolvedValue({ uid: 'firebase-uid' });
    vi.mocked(repository.resolveFirebasePrincipal).mockResolvedValue(null);

    await expect(service.authenticateFirebaseToken('valid')).rejects.toMatchObject(
      {
        code: 'IDENTITY_NOT_LINKED',
        status: HttpStatus.FORBIDDEN,
      } satisfies Partial<ApiException>,
    );
  });

  it('resolves a valid Firebase identity with an active application mapping', async () => {
    vi.mocked(verifier.verifyIdToken).mockResolvedValue({ uid: 'firebase-uid' });
    vi.mocked(repository.resolveFirebasePrincipal).mockResolvedValue(principal);

    await expect(service.authenticateFirebaseToken('valid')).resolves.toEqual(
      principal,
    );
  });
});
