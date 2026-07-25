const TEST_DATABASE_NAME = /(?:^|_)(?:test|testing)(?:_|$)/i;
const PRODUCTION_MARKER =
  /(?:^|[._-])(?:prod(?:uction)?|stag(?:e|ing)|live)(?:[._-]|$)/i;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type TestDatabaseSafetyEnvironment = {
  TEST_DATABASE_DESTRUCTIVE_ACK?: string;
};

export function assertSafeTestDatabaseUrl(
  connectionString: string,
  environment: TestDatabaseSafetyEnvironment = process.env,
): URL {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('TEST_DATABASE_URL must use the PostgreSQL protocol');
  }

  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    !databaseName ||
    databaseName.includes('/') ||
    !TEST_DATABASE_NAME.test(databaseName)
  ) {
    throw new Error(
      'TEST_DATABASE_URL must name an explicitly disposable test database',
    );
  }

  if (
    PRODUCTION_MARKER.test(databaseName) ||
    PRODUCTION_MARKER.test(url.hostname)
  ) {
    throw new Error('TEST_DATABASE_URL must not target a production-like host');
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    const expectedAcknowledgement = `I_UNDERSTAND:${databaseName}`;
    if (
      environment.TEST_DATABASE_DESTRUCTIVE_ACK !== expectedAcknowledgement
    ) {
      throw new Error(
        'Remote destructive database tests require an exact acknowledgement',
      );
    }
  }

  return url;
}
