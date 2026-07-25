import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import { describe, expect, it, vi } from 'vitest';

import { FirebaseAdminTokenVerifier } from '../../src/auth/firebase-admin-token-verifier';
import {
  FirebaseAuthenticationUnavailableError,
  InvalidFirebaseTokenError,
} from '../../src/auth/firebase-token-verifier';

describe('FirebaseAdminTokenVerifier', () => {
  it('accepts a valid active token and enables revocation checking', async () => {
    const firebaseAuth = {
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'active-firebase-user',
      } satisfies Partial<DecodedIdToken>),
    };
    const verifier = new FirebaseAdminTokenVerifier(
      firebaseAuth as unknown as Auth,
    );

    await expect(verifier.verifyIdToken('valid-token')).resolves.toEqual({
      uid: 'active-firebase-user',
    });
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith('valid-token', true);
  });

  it.each([
    ['revoked token', 'auth/id-token-revoked'],
    ['disabled Firebase user', 'auth/user-disabled'],
    ['expired token', 'auth/id-token-expired'],
    ['invalid token', 'auth/invalid-id-token'],
  ])('classifies a %s as an authentication failure', async (_case, code) => {
    const firebaseAuth = {
      verifyIdToken: vi.fn().mockRejectedValue({ code }),
    };
    const verifier = new FirebaseAdminTokenVerifier(
      firebaseAuth as unknown as Auth,
    );

    await expect(verifier.verifyIdToken('rejected-token')).rejects.toBeInstanceOf(
      InvalidFirebaseTokenError,
    );
  });

  it.each([
    ['invalid credential', 'auth/invalid-credential'],
    ['project configuration', 'auth/project-not-found'],
    ['network/provider failure', 'app/network-error'],
  ])('classifies %s as a safe infrastructure failure', async (_case, code) => {
    const firebaseAuth = {
      verifyIdToken: vi.fn().mockRejectedValue({ code }),
    };
    const verifier = new FirebaseAdminTokenVerifier(
      firebaseAuth as unknown as Auth,
    );

    await expect(verifier.verifyIdToken('unverified-token')).rejects.toBeInstanceOf(
      FirebaseAuthenticationUnavailableError,
    );
  });

  it('does not pass through raw Firebase errors', async () => {
    const rawError = new Error('credential=private token=secret');
    const firebaseAuth = {
      verifyIdToken: vi.fn().mockRejectedValue(rawError),
    };
    const verifier = new FirebaseAdminTokenVerifier(
      firebaseAuth as unknown as Auth,
    );

    await expect(verifier.verifyIdToken('unverified-token')).rejects.not.toBe(
      rawError,
    );
  });
});
