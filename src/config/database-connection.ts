import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

type ConnectionOptions = Pick<
  PostgresConnectionOptions,
  'url' | 'host' | 'port' | 'username' | 'password' | 'database' | 'ssl'
>;

export function databaseConnection(
  env: NodeJS.ProcessEnv,
  migrations = false,
): ConnectionOptions {
  const url = migrations
    ? env.DATABASE_URL_UNPOOLED || env.DATABASE_URL
    : env.DATABASE_URL;

  // URL settings (including TLS) must not be overridden by legacy DB_* values.
  if (url) return { url };

  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    username: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'password',
    database: env.DB_NAME || '',
    ssl: env.DB_SSL === 'true',
  };
}
