export const APPLICATION_ROLES = [
  'admin',
  'coordinator',
  'employer',
] as const;

export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

export type ApplicationPrincipal = {
  applicationUserId: string;
  authProvider: 'firebase';
  authSubject: string;
  roles: ApplicationRole[];
  coordinator?: {
    id: string;
    centerId: string;
  };
  employerContact?: {
    contactId: string;
    employerId: string;
    canManageEmployer: boolean;
  };
};

export function isApplicationRole(value: string): value is ApplicationRole {
  return APPLICATION_ROLES.some((role) => role === value);
}
