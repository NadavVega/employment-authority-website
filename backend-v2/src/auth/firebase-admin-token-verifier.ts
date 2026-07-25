import type { Auth } from 'firebase-admin/auth';

import {
  InvalidFirebaseTokenError,
  type FirebaseIdentity,
  type FirebaseTokenVerifier,
} from './firebase-token-verifier';

export class FirebaseAdminTokenVerifier implements FirebaseTokenVerifier {
  constructor(private readonly firebaseAuth: Auth) {}

  async verifyIdToken(token: string): Promise<FirebaseIdentity> {
    try {
      const decodedToken = await this.firebaseAuth.verifyIdToken(token);
      return { uid: decodedToken.uid };
    } catch {
      throw new InvalidFirebaseTokenError();
    }
  }
}
