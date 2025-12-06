import { DataSource } from 'typeorm';
import path from 'path';
import { databaseConfig, validateDatabaseConfig } from './database.config';

// dotenv ya está cargado en database.config.ts

// Validar configuración al cargar
const validation = validateDatabaseConfig();
if (!validation.valid) {
  console.warn('⚠️  Advertencia: Variables de entorno faltantes:', validation.missing.join(', '));
  console.warn('   La conexión a la base de datos puede fallar.');
}

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: databaseConfig.host,
  port: databaseConfig.port,
  username: databaseConfig.username,
  password: databaseConfig.password,
  database: databaseConfig.database,
  
  // Configuración de conexión para SQL Server
  options: {
    ...databaseConfig.options,
    instanceName: databaseConfig.instance,
  },
  
  // Entidades - usar rutas absolutas y relativas
  entities: [
    path.join(__dirname, '../entities/**/*.entity{.ts,.js}'),
  ],
  
  // Migraciones
  migrations: [
    path.join(__dirname, '../migrations/**/*{.ts,.js}'),
  ],
  migrationsTableName: 'migrations',
  
  // Sincronización - NUNCA en producción (usar migraciones)
  synchronize: false,
  
  // Logging
  logging: databaseConfig.logging,
  logger: databaseConfig.logging ? 'advanced-console' : undefined,
  
  // Pool de conexiones para SQL Server
  extra: {
    pool: databaseConfig.pool,
    connectionTimeout: databaseConfig.options.connectionTimeout,
    requestTimeout: databaseConfig.options.requestTimeout,
    enableArithAbort: databaseConfig.options.enableArithAbort,
  },
});
