import type { DecodedIdToken } from 'firebase-admin/auth';

export const FIREBASE_TOKEN_VERIFIER = Symbol('FIREBASE_TOKEN_VERIFIER');

export type FirebaseIdentity = Pick<DecodedIdToken, 'uid'>;

export interface FirebaseTokenVerifier {
  verifyIdToken(token: string): Promise<FirebaseIdentity>;
}

export class InvalidFirebaseTokenError extends Error {
  constructor() {
    super('Invalid Firebase ID token');
    this.name = 'InvalidFirebaseTokenError';
  }
}

export class FirebaseAuthenticationUnavailableError extends Error {
  constructor() {
    super('Firebase authentication is unavailable');
    this.name = 'FirebaseAuthenticationUnavailableError';
  }
}
