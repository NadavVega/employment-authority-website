import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { StructuredLoggerService } from '../common/logging/structured-logger.service';
import { AppConfigService } from '../config/app-config.service';
import * as schema from './schema';
import { checkDatabaseReadiness } from './readiness';

@Injectable()
export class DatabaseService
  implements OnModuleInit, OnApplicationShutdown
{
  readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.pool = new Pool(config.databasePoolConfig);
    this.pool.on('error', (error: Error) => {
      this.logger.errorEvent('database_pool_error', {
        errorType: error.constructor.name,
      });
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit(): Promise<void> {
    const ready = await this.isReady();
    if (ready) {
      this.logger.infoEvent('database_pool_initialized');
    } else {
      this.logger.warnEvent('database_not_ready_at_startup');
    }
  }

  async isReady(): Promise<boolean> {
    return checkDatabaseReadiness(
      this.pool,
      this.config.databaseReadinessTimeoutMs,
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.infoEvent('database_pool_closed');
  }
}
