import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { StructuredLoggerService } from '../logging/structured-logger.service';
import { ApiException } from './api.exception';
import type { ProblemDetails } from './problem-details';

const DEFAULT_ERRORS: Record<
  number,
  Pick<ProblemDetails, 'code' | 'detail' | 'title'>
> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'INVALID_REQUEST',
    title: 'Invalid request',
    detail: 'The request could not be processed.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'AUTHENTICATION_REQUIRED',
    title: 'Authentication required',
    detail: 'A valid authentication token is required.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: 'FORBIDDEN',
    title: 'Access denied',
    detail: 'You are not allowed to perform this operation.',
  },
  [HttpStatus.NOT_FOUND]: {
    code: 'NOT_FOUND',
    title: 'Resource not found',
    detail: 'The requested resource was not found.',
  },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    title: 'Request conflict',
    detail: 'The request conflicts with the current resource state.',
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    code: 'DEPENDENCY_UNAVAILABLE',
    title: 'Service unavailable',
    detail: 'A required service dependency is unavailable.',
  },
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & {
      requestId?: string;
    }>();
    const requestId = request.requestId ?? randomUUID();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const safeError =
      exception instanceof ApiException
        ? {
            code: exception.code,
            title: exception.title,
            detail: exception.detail,
            errors: exception.errors,
          }
        : {
            ...(DEFAULT_ERRORS[status] ?? {
              code: 'INTERNAL_ERROR',
              title: 'Internal server error',
              detail: 'An unexpected error occurred.',
            }),
            errors: [],
          };

    if (status >= 500) {
      this.logger.errorEvent('http_request_failed', {
        requestId,
        method: request.method,
        path: request.path,
        statusCode: status,
        errorType:
          exception instanceof Error
            ? exception.constructor.name
            : 'UnknownError',
      });
    }

    const body: ProblemDetails = {
      type: `https://api.example/errors/${safeError.code
        .toLowerCase()
        .replaceAll('_', '-')}`,
      title: safeError.title,
      status,
      code: safeError.code,
      detail: safeError.detail,
      requestId,
      errors: safeError.errors,
    };

    response.status(status).json(body);
  }
}
