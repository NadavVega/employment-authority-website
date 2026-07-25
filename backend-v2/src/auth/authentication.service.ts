import { Inject, Injectable } from '@nestjs/common';

import {
  AuthenticationRequiredException,
  DependencyUnavailableException,
  IdentityNotLinkedException,
} from '../common/errors/api-exceptions';
import type { ApplicationPrincipal } from './application-principal';
import {
  FirebaseAuthenticationUnavailableError,
  FIREBASE_TOKEN_VERIFIER,
  InvalidFirebaseTokenError,
  type FirebaseTokenVerifier,
} from './firebase-token-verifier';
import { PrincipalRepository } from './principal.repository';

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(FIREBASE_TOKEN_VERIFIER)
    private readonly firebaseTokenVerifier: FirebaseTokenVerifier,
    private readonly principalRepository: PrincipalRepository,
  ) {}

  async authenticateFirebaseToken(
    token: string,
  ): Promise<ApplicationPrincipal> {
    let uid: string;
    try {
      ({ uid } = await this.firebaseTokenVerifier.verifyIdToken(token));
    } catch (error: unknown) {
      if (error instanceof InvalidFirebaseTokenError) {
        throw new AuthenticationRequiredException();
      }
      if (error instanceof FirebaseAuthenticationUnavailableError) {
        throw new DependencyUnavailableException();
      }
      throw error;
    }

    const principal =
      await this.principalRepository.resolveFirebasePrincipal(uid);
    if (!principal) {
      throw new IdentityNotLinkedException();
    }
    return principal;
  }
}
