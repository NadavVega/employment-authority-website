import type { ValidationError } from 'class-validator';

import { ValidationApiException } from './api-exceptions';
import type { FieldError } from './problem-details';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [
      ...ownErrors,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}

export function validationExceptionFactory(
  errors: ValidationError[],
): ValidationApiException {
  return new ValidationApiException(flattenValidationErrors(errors));
}
