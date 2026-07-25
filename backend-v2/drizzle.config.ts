import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'MIGRATION_DATABASE_URL or DATABASE_URL is required for Drizzle commands',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  schemaFilter: ['app'],
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    schema: 'drizzle',
    table: '__drizzle_migrations',
  },
  strict: true,
  verbose: true,
});
