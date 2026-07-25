import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { catchError, type Observable, tap, throwError } from 'rxjs';

import type { RequestWithContext } from './request-context';
import { StructuredLoggerService } from './structured-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = performance.now();

    const logCompletion = (statusCode: number): void => {
      this.logger.infoEvent('http_request_completed', {
        requestId: request.requestId,
        method: request.method,
        path: request.route?.path ?? request.path,
        statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        applicationUserId: request.principal?.applicationUserId,
      });
    };

    return next.handle().pipe(
      tap(() => logCompletion(response.statusCode)),
      catchError((error: unknown) => {
        logCompletion(error instanceof HttpException ? error.getStatus() : 500);
        return throwError(() => error);
      }),
    );
  }
}
