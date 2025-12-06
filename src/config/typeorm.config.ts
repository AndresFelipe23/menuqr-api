import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Configuración para TypeORM CLI (migraciones)
export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'MenuQR',
  
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false', // true por defecto
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== 'false', // true por defecto
    enableArithAbort: true,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
  },
  
  entities: ['src/entities/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

