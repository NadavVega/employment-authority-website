import { z } from 'zod';

const postgresUrl = z.string().min(1).superRefine((value, context) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      context.addIssue({
        code: 'custom',
        message: 'must use the postgres or postgresql protocol',
      });
    }
  } catch {
    context.addIssue({
      code: 'custom',
      message: 'must be a valid PostgreSQL URL',
    });
  }
});

const booleanValue = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

const databaseSslMode = z.enum(['disable', 'verify-full']);

function hasInsecureSslQuery(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get('sslmode');
    return (
      (sslMode !== null && sslMode !== 'verify-full') ||
      url.searchParams.has('ssl')
    );
  } catch {
    return true;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  );
}

function validateCorsOrigins(
  configuredOrigins: string | undefined,
  nodeEnvironment: 'development' | 'test' | 'production',
  allowInsecureLocalhost: boolean,
  context: z.RefinementCtx,
): void {
  const origins =
    configuredOrigins
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      const isHttpOrigin =
        url.protocol === 'http:' || url.protocol === 'https:';
      const isOriginOnly =
        url.pathname === '/' &&
        url.search === '' &&
        url.hash === '';
      const hasCredentials = url.username !== '' || url.password !== '';
      const permitsProductionHttp =
        nodeEnvironment !== 'production' ||
        url.protocol === 'https:' ||
        (allowInsecureLocalhost && isLoopbackHostname(url.hostname));

      if (
        !isHttpOrigin ||
        !isOriginOnly ||
        hasCredentials ||
        url.origin === 'null' ||
        !permitsProductionHttp
      ) {
        throw new Error('invalid origin');
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ALLOWED_ORIGINS'],
        message: 'contains an invalid or insecure origin',
      });
      return;
    }
  }
}

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    REQUEST_BODY_LIMIT: z
      .string()
      .regex(/^\d+(?:b|kb|mb)$/i)
      .default('1mb'),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    CORS_ALLOW_INSECURE_LOCALHOST: booleanValue.default(false),
    DATABASE_URL: postgresUrl,
    DATABASE_SSL: databaseSslMode.default('disable'),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_CONNECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(250)
      .max(60_000)
      .default(5_000),
    DB_IDLE_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(600_000)
      .default(30_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(250)
      .max(120_000)
      .default(15_000),
    DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(600_000)
      .default(30_000),
    DB_READINESS_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(10_000)
      .default(2_000),
    FIREBASE_PROJECT_ID: z.string().trim().min(1),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === 'production' &&
      !environment.CORS_ALLOWED_ORIGINS
    ) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ALLOWED_ORIGINS'],
        message: 'is required in production',
      });
    }

    if (
      environment.NODE_ENV === 'production' &&
      environment.DATABASE_SSL !== 'verify-full'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_SSL'],
        message: 'must be verify-full in production',
      });
    }
    if (
      environment.NODE_ENV === 'production' &&
      hasInsecureSslQuery(environment.DATABASE_URL)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'must not override verified TLS',
      });
    }

    validateCorsOrigins(
      environment.CORS_ALLOWED_ORIGINS,
      environment.NODE_ENV,
      environment.CORS_ALLOW_INSECURE_LOCALHOST,
      context,
    );
  });

export type Environment = z.infer<typeof environmentSchema>;

const migrationEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    MIGRATION_DATABASE_URL: postgresUrl.optional(),
    DATABASE_URL: postgresUrl.optional(),
    DATABASE_SSL: databaseSslMode.default('disable'),
    DB_CONNECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(250)
      .max(60_000)
      .default(5_000),
  })
  .superRefine((environment, context) => {
    if (!environment.MIGRATION_DATABASE_URL && !environment.DATABASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['MIGRATION_DATABASE_URL'],
        message: 'is required',
      });
    }

    if (
      environment.NODE_ENV === 'production' &&
      !environment.MIGRATION_DATABASE_URL
    ) {
      context.addIssue({
        code: 'custom',
        path: ['MIGRATION_DATABASE_URL'],
        message: 'is required in production',
      });
    }

    if (
      environment.NODE_ENV === 'production' &&
      environment.DATABASE_SSL !== 'verify-full'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_SSL'],
        message: 'must be verify-full in production',
      });
    }

    const selectedDatabaseUrl =
      environment.MIGRATION_DATABASE_URL ?? environment.DATABASE_URL;
    if (
      environment.NODE_ENV === 'production' &&
      selectedDatabaseUrl &&
      hasInsecureSslQuery(selectedDatabaseUrl)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['MIGRATION_DATABASE_URL'],
        message: 'must not override verified TLS',
      });
    }
  });

export type MigrationEnvironment = {
  connectionTimeoutMs: number;
  databaseUrl: string;
  nodeEnvironment: 'development' | 'test' | 'production';
  sslMode: 'disable' | 'verify-full';
};

function configurationError(error: z.ZodError): Error {
  const fields = [
    ...new Set(
      error.issues.map((issue) => issue.path.join('.') || 'environment'),
    ),
  ].join(', ');
  return new Error(`Invalid Backend V2 configuration: ${fields}`);
}

export function validateEnvironment(
  rawEnvironment: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(rawEnvironment);

  if (!result.success) {
    throw configurationError(result.error);
  }

  return result.data;
}

export function validateMigrationEnvironment(
  rawEnvironment: Record<string, unknown>,
): MigrationEnvironment {
  const result = migrationEnvironmentSchema.safeParse(rawEnvironment);

  if (!result.success) {
    throw configurationError(result.error);
  }

  const databaseUrl =
    result.data.MIGRATION_DATABASE_URL ?? result.data.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Invalid Backend V2 configuration: MIGRATION_DATABASE_URL');
  }

  return {
    connectionTimeoutMs: result.data.DB_CONNECTION_TIMEOUT_MS,
    databaseUrl,
    nodeEnvironment: result.data.NODE_ENV,
    sslMode: result.data.DATABASE_SSL,
  };
}
