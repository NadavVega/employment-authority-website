import * as admin from 'firebase-admin';

/**
 * Unified User Record for the JEA Platform.
 * Integrates Identity, Role-Based Access Control (RBAC), and Whitelist status.
 */
export interface IUserRecord {
  /** Whitelist Status: True if the user is authorized to enter the system. */
  isWhitelisted: boolean;

  /** 
   * Role-Based Access Control:
   * 'admin' - Full access and moderation.
   * 'coordinator' - Directory access and event management.
   * 'employer' - Event registration and content submission.
   * 'guest' - View only events and articles.
   */
  role: 'admin' | 'coordinator' | 'employer' | 'guest';

  /** Public profile visible in the directory */
  profile: {
    fullName: string;
    company?: string;
    center?: string; // The JEA branch they belong to
    [key: string]: any; // Allow other profile fields if necessary
  };

  /** History of contacts between coordinators and the user */
  contactHistory: {
    firstContact?: admin.firestore.Timestamp;
    lastContact?: admin.firestore.Timestamp;
    coordinatorsNotes?: string;
  };

  // Note: The `personalMobile` field is intentionally excluded from the main record.
  // It resides in the `private_info` sub-collection to enforce double opt-in.
}

/**
 * Sensitive Private Data located in the `users/{uid}/private_info/details` document.
 * Requires Double Opt-in (employer + coordinator confirmed) to access.
 */
export interface IPrivateInfo {
  personalMobile: string;
}