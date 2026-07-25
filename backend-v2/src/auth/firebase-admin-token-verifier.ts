import type { Auth } from 'firebase-admin/auth';

import {
  FirebaseAuthenticationUnavailableError,
  InvalidFirebaseTokenError,
  type FirebaseIdentity,
  type FirebaseTokenVerifier,
} from './firebase-token-verifier';

const AUTHENTICATION_FAILURE_CODES = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
]);

export class FirebaseAdminTokenVerifier implements FirebaseTokenVerifier {
  constructor(private readonly firebaseAuth: Auth) {}

  async verifyIdToken(token: string): Promise<FirebaseIdentity> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(token, true);
      return { uid: decodedToken.uid };
    } catch (error: unknown) {
      if (isAuthenticationFailure(error)) {
        throw new InvalidFirebaseTokenError();
      }
      throw new FirebaseAuthenticationUnavailableError();
    }
  }
}

function isAuthenticationFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  const code = error.code;
  return typeof code === 'string' && AUTHENTICATION_FAILURE_CODES.has(code);
}
