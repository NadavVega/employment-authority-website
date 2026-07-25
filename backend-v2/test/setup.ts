process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'silent';
process.env.REQUEST_BODY_LIMIT = '1mb';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:55432/employment_authority_v2';
process.env.DATABASE_SSL = 'disable';
process.env.DB_POOL_MAX = '2';
process.env.DB_CONNECTION_TIMEOUT_MS = '500';
process.env.DB_IDLE_TIMEOUT_MS = '1000';
process.env.DB_READINESS_TIMEOUT_MS = '500';
process.env.FIREBASE_PROJECT_ID = 'backend-v2-test-project';
