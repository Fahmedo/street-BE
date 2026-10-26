import { databaseConnection } from './database-connection';

describe('databaseConnection', () => {
  const env = {
    DATABASE_URL:
      'postgresql://user:password@pooled.example/app?sslmode=require',
    DATABASE_URL_UNPOOLED:
      'postgresql://user:password@direct.example/app?sslmode=require',
    DB_HOST: 'old.example',
    DB_USERNAME: 'old-user',
    DB_PASSWORD: 'old-password',
    DB_NAME: 'old-database',
    DB_SSL: 'false',
  };

  it('uses the application URL without legacy overrides', () => {
    expect(databaseConnection(env)).toEqual({ url: env.DATABASE_URL });
  });

  it('uses the direct URL for migrations', () => {
    expect(databaseConnection(env, true)).toEqual({
      url: env.DATABASE_URL_UNPOOLED,
    });
  });

  it('supports deployments with only DATABASE_URL', () => {
    expect(
      databaseConnection({ DATABASE_URL: env.DATABASE_URL }, true),
    ).toEqual({
      url: env.DATABASE_URL,
    });
  });

  it('preserves legacy connections with numeric ports and explicit TLS', () => {
    expect(
      databaseConnection({
        DB_HOST: 'localhost',
        DB_PORT: '5433',
        DB_SSL: 'true',
      }),
    ).toMatchObject({
      host: 'localhost',
      port: 5433,
      ssl: true,
    });
  });
});
