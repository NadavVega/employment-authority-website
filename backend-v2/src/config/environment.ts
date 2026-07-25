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
    DATABASE_URL: postgresUrl,
    DATABASE_SSL: z.enum(['disable', 'verify-full']).default('disable'),
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
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  rawEnvironment: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(rawEnvironment);

  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map((issue) => issue.path.join('.') || 'environment'),
      ),
    ].join(', ');
    throw new Error(`Invalid Backend V2 configuration: ${fields}`);
  }

  return result.data;
}
