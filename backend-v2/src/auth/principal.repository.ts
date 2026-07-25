import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import {
  applicationUsersInApp,
  authIdentitiesInApp,
  centersInApp,
  coordinatorsInApp,
  employerContactsInApp,
  employersInApp,
  rolesInApp,
  userRolesInApp,
} from '../database/schema';
import {
  isApplicationRole,
  type ApplicationPrincipal,
  type ApplicationRole,
} from './application-principal';

@Injectable()
export class PrincipalRepository {
  constructor(private readonly database: DatabaseService) {}

  async resolveFirebasePrincipal(
    firebaseUid: string,
  ): Promise<ApplicationPrincipal | null> {
    const [identity] = await this.database.db
      .select({
        applicationUserId: applicationUsersInApp.id,
      })
      .from(authIdentitiesInApp)
      .innerJoin(
        applicationUsersInApp,
        eq(
          authIdentitiesInApp.applicationUserId,
          applicationUsersInApp.id,
        ),
      )
      .where(
        and(
          eq(authIdentitiesInApp.provider, 'firebase'),
          eq(authIdentitiesInApp.providerSubject, firebaseUid),
          isNull(authIdentitiesInApp.retiredAt),
          eq(applicationUsersInApp.status, 'active'),
        ),
      )
      .limit(1);

    if (!identity) {
      return null;
    }

    const roleRows = await this.database.db
      .select({ code: rolesInApp.code })
      .from(userRolesInApp)
      .innerJoin(rolesInApp, eq(userRolesInApp.roleId, rolesInApp.id))
      .where(
        and(
          eq(userRolesInApp.applicationUserId, identity.applicationUserId),
          isNull(userRolesInApp.revokedAt),
        ),
      )
      .orderBy(asc(rolesInApp.code));

    const grantedRoles = new Set<ApplicationRole>(
      roleRows
        .map(({ code }) => code)
        .filter((code): code is ApplicationRole => isApplicationRole(code)),
    );

    const coordinator = grantedRoles.has('coordinator')
      ? await this.loadCoordinator(identity.applicationUserId)
      : undefined;
    const employerContact = grantedRoles.has('employer')
      ? await this.loadEmployerContact(identity.applicationUserId)
      : undefined;

    const roles = [...grantedRoles].filter(
      (role) =>
        role === 'admin' ||
        (role === 'coordinator' && coordinator !== undefined) ||
        (role === 'employer' && employerContact !== undefined),
    );

    if (roles.length === 0) {
      return null;
    }

    return {
      applicationUserId: identity.applicationUserId,
      authProvider: 'firebase',
      authSubject: firebaseUid,
      roles,
      ...(coordinator ? { coordinator } : {}),
      ...(employerContact ? { employerContact } : {}),
    };
  }

  private async loadCoordinator(
    applicationUserId: string,
  ): Promise<ApplicationPrincipal['coordinator'] | undefined> {
    const [coordinator] = await this.database.db
      .select({
        id: coordinatorsInApp.id,
        centerId: coordinatorsInApp.centerId,
      })
      .from(coordinatorsInApp)
      .innerJoin(centersInApp, eq(coordinatorsInApp.centerId, centersInApp.id))
      .where(
        and(
          eq(coordinatorsInApp.applicationUserId, applicationUserId),
          eq(coordinatorsInApp.isActive, true),
          eq(centersInApp.status, 'active'),
        ),
      )
      .limit(1);

    return coordinator;
  }

  private async loadEmployerContact(
    applicationUserId: string,
  ): Promise<ApplicationPrincipal['employerContact'] | undefined> {
    const [contact] = await this.database.db
      .select({
        contactId: employerContactsInApp.id,
        employerId: employerContactsInApp.employerId,
        canManageEmployer: employerContactsInApp.canManageEmployer,
      })
      .from(employerContactsInApp)
      .innerJoin(
        employersInApp,
        eq(employerContactsInApp.employerId, employersInApp.id),
      )
      .where(
        and(
          eq(employerContactsInApp.applicationUserId, applicationUserId),
          isNull(employerContactsInApp.deletedAt),
          eq(employersInApp.status, 'active'),
          isNull(employersInApp.deletedAt),
        ),
      )
      .limit(1);

    return contact;
  }
}
