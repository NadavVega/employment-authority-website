import { describe, expect, it, vi } from 'vitest';

import type { StructuredLoggerService } from '../../src/common/logging/structured-logger.service';
import type { AppConfigService } from '../../src/config/app-config.service';
import { DatabaseService } from '../../src/database/database.service';

describe('DatabaseService pool safeguards', () => {
  it('configures conservative server-side query and idle-transaction timeouts', async () => {
    const logger = loggerStub();
    const config = {
      databasePoolConfig: {
        connectionString:
          'postgresql://postgres@127.0.0.1:1/backend_v2_test',
        connectionTimeoutMillis: 250,
        idle_in_transaction_session_timeout: 30_000,
        statement_timeout: 15_000,
      },
      databaseReadinessTimeoutMs: 500,
    } as unknown as AppConfigService;
    const service = new DatabaseService(
      config,
      logger as unknown as StructuredLoggerService,
    );

    expect(service.pool.options.statement_timeout).toBe(15_000);
    expect(service.pool.options.idle_in_transaction_session_timeout).toBe(
      30_000,
    );
    await service.onApplicationShutdown();
  });

  it('handles idle pool errors with safe structured metadata', async () => {
    const logger = loggerStub();
    const config = {
      databasePoolConfig: {
        connectionString:
          'postgresql://postgres@127.0.0.1:1/backend_v2_test',
        connectionTimeoutMillis: 250,
      },
      databaseReadinessTimeoutMs: 500,
    } as unknown as AppConfigService;
    const service = new DatabaseService(
      config,
      logger as unknown as StructuredLoggerService,
    );

    service.pool.emit('error', new Error('password=secret token=secret'));

    expect(logger.errorEvent).toHaveBeenCalledWith('database_pool_error', {
      errorType: 'Error',
    });
    expect(JSON.stringify(logger.errorEvent.mock.calls)).not.toContain(
      'password=secret',
    );
    await service.onApplicationShutdown();
  });
});

function loggerStub() {
  return {
    errorEvent: vi.fn(),
    infoEvent: vi.fn(),
    warnEvent: vi.fn(),
  };
}
