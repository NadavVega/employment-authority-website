import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { checkDatabaseReadiness } from '../../src/database/readiness';

describe('database readiness cleanup', () => {
  it('reports ready only for a compatible migration result', async () => {
    const client = clientWithQueries([
      {},
      {},
      { rows: [{ compatible: true }] },
      {},
    ]);
    const pool = poolWithClient(client);

    await expect(checkDatabaseReadiness(pool, 500)).resolves.toBe(true);
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('rolls back and reports not ready when compatibility checking fails', async () => {
    const client = clientWithQueries([
      {},
      {},
      new Error('schema unavailable'),
      {},
    ]);
    const pool = poolWithClient(client);

    await expect(checkDatabaseReadiness(pool, 500)).resolves.toBe(false);
    expect(client.release).toHaveBeenCalledWith(false);
  });

  it('destroys a client when transaction cleanup cannot be proven', async () => {
    const client = clientWithQueries([
      {},
      {},
      new Error('schema unavailable'),
      new Error('rollback failed'),
    ]);
    const pool = poolWithClient(client);

    await expect(checkDatabaseReadiness(pool, 500)).resolves.toBe(false);
    expect(client.release).toHaveBeenCalledWith(true);
  });
});

function clientWithQueries(
  outcomes: Array<Record<string, unknown> | Error>,
): PoolClient {
  const query = vi.fn();
  for (const outcome of outcomes) {
    if (outcome instanceof Error) {
      query.mockRejectedValueOnce(outcome);
    } else {
      query.mockResolvedValueOnce(outcome);
    }
  }

  return {
    query,
    release: vi.fn(),
  } as unknown as PoolClient;
}

function poolWithClient(client: PoolClient): Pick<Pool, 'connect'> {
  return {
    connect: vi.fn().mockResolvedValue(client),
  };
}
