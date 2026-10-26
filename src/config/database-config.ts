import { registerAs } from '@nestjs/config';
import { databaseConnection } from './database-connection';

export default registerAs('database', () => ({
  type: 'postgres',
  ...databaseConnection(process.env),
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
}));
