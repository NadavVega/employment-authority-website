import { Injectable } from '@nestjs/common';

import { DependencyUnavailableException } from '../common/errors/api-exceptions';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async readiness(): Promise<{ status: 'ready' }> {
    if (!(await this.database.isReady())) {
      throw new DependencyUnavailableException();
    }
    return { status: 'ready' };
  }
}
