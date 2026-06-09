import { auth, db } from './config';

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

/**
 * Checks if a user's email exists in the unified users collection.
 * Supports flexible database structures:
 * - root level fields
 * - nested contactHistory fields
 * - nested profile role
 *
 * @param {string} email - The user email to verify.
 * @returns {Promise<Object|null>} User data if whitelisted, otherwise null.
 */
export const checkWhitelist = async (email) => {
  try {
    if (!email) {
      return null;
    }

    const normalizedEmail = email.toLowerCase();
    const userRef = doc(db, 'users', normalizedEmail);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();

    const isRootWhitelisted =
      userData.isWhitelisted === true ||
      userData.isWhiteListed === true;

    const isHistoryWhitelisted =
      userData.contactHistory?.isWhitelisted === true ||
      userData.contactHistory?.isWhiteListed === true;

    if (!isRootWhitelisted && !isHistoryWhitelisted) {
      return null;
    }

    const userRole = userData.role || userData.profile?.role;

    if (!userRole) {
      return null;
    }

    return {
      email: normalizedEmail,
      role: userRole,
      ...userData,
    };
  } catch (error) {
    console.error('AuthService Error: users whitelist check failed', error);
    throw error;
  }
};

/**
 * Signs in a user using email and password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export const loginUser = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('AuthService Error: login failed', error);
    throw error;
  }
};

/**
 * Signs out the currently authenticated user.
 *
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('AuthService Error: logout failed', error);
    throw error;
  }
};

/**
 * Subscribes to authentication state changes.
 *
 * @param {Function} callback - Function to run when the auth state changes.
 * @returns {Unsubscribe}
 */
export const subscribeToAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};