import { HttpStatus } from '@nestjs/common';

import { ApiException } from './api.exception';
import type { FieldError } from './problem-details';

export class ValidationApiException extends ApiException {
  constructor(errors: FieldError[]) {
    super({
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_FAILED',
      title: 'Request validation failed',
      detail: 'One or more request fields are invalid.',
      errors,
    });
  }
}

export class AuthenticationRequiredException extends ApiException {
  constructor() {
    super({
      status: HttpStatus.UNAUTHORIZED,
      code: 'AUTHENTICATION_REQUIRED',
      title: 'Authentication required',
      detail: 'A valid authentication token is required.',
    });
  }
}

export class IdentityNotLinkedException extends ApiException {
  constructor() {
    super({
      status: HttpStatus.FORBIDDEN,
      code: 'IDENTITY_NOT_LINKED',
      title: 'Application access denied',
      detail: 'The authenticated identity is not active for this application.',
    });
  }
}

export class DependencyUnavailableException extends ApiException {
  constructor() {
    super({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'DEPENDENCY_UNAVAILABLE',
      title: 'Service not ready',
      detail: 'A required service dependency is unavailable.',
    });
  }
}
