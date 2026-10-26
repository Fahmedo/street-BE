import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { databaseConnection } from './config/database-connection';
dotenv.config({ path: ['.env.local', '.env'] });
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...databaseConnection(process.env, true),
  synchronize: false,
  logging: true,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
