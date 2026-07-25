import { Module } from '@nestjs/common';
import {
  applicationDefault,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import { AppConfigService } from '../config/app-config.service';
import { AuthenticationService } from './authentication.service';
import { FirebaseAdminTokenVerifier } from './firebase-admin-token-verifier';
import {
  FIREBASE_TOKEN_VERIFIER,
  type FirebaseTokenVerifier,
} from './firebase-token-verifier';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { PrincipalRepository } from './principal.repository';

const FIREBASE_APP_NAME = 'employment-authority-backend-v2';

@Module({
  providers: [
    {
      provide: FIREBASE_TOKEN_VERIFIER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): FirebaseTokenVerifier => {
        const existing = getApps().find(
          (app) => app.name === FIREBASE_APP_NAME,
        );
        const app: App =
          existing ??
          initializeApp(
            {
              credential: applicationDefault(),
              projectId: config.firebaseProjectId,
            },
            FIREBASE_APP_NAME,
          );
        return new FirebaseAdminTokenVerifier(getAuth(app));
      },
    },
    AuthenticationService,
    PrincipalRepository,
    FirebaseAuthGuard,
  ],
  exports: [AuthenticationService, FirebaseAuthGuard],
})
export class AuthModule {}
