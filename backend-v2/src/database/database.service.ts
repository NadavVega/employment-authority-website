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
    let client;
    try {
      client = await this.pool.connect();
      await client.query('select set_config($1, $2, false)', [
        'statement_timeout',
        String(this.config.databaseReadinessTimeoutMs),
      ]);
      await client.query('select 1');
      return true;
    } catch {
      return false;
    } finally {
      if (client) {
        await client.query('reset statement_timeout').catch(() => undefined);
        client.release();
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.infoEvent('database_pool_closed');
  }
}
