import { HttpException } from '@nestjs/common';

import type { FieldError } from './problem-details';

export type ApiExceptionOptions = {
  status: number;
  code: string;
  title: string;
  detail: string;
  errors?: FieldError[];
};

export class ApiException extends HttpException {
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly errors: FieldError[];

  constructor(options: ApiExceptionOptions) {
    super(options.detail, options.status);
    this.code = options.code;
    this.title = options.title;
    this.detail = options.detail;
    this.errors = options.errors ?? [];
  }
}
