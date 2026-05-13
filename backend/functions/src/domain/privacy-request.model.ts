/**
 * Privacy Request Record for Double Opt-in.
 * This collection enforces the rule that an employer cannot see a user's `personalMobile`
 * unless BOTH the employer and the coordinator have confirmed the request.
 */
export interface IPrivacyRequest {
  requester_uid: string; // The employer requesting the private info
  target_uid: string; // The user whose info is being requested
  employer_confirmed: boolean;
  coordinator_confirmed: boolean;
}
