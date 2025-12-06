import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de la base de datos
 * Centraliza todas las opciones de configuración para fácil acceso
 */
// Detectar si es un servidor en la nube (no localhost)
const isCloudServer = (host: string): boolean => {
  return !host.includes('localhost') && 
         !host.includes('127.0.0.1') && 
         (host.includes('.') || host.includes('cloud'));
};

const dbHost = process.env.DB_HOST!;
const isCloud = isCloudServer(dbHost);

export const databaseConfig = {
  host: dbHost,
  port: parseInt(process.env.DB_PORT!),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
  instance: process.env.DB_INSTANCE,
  
  // Opciones de conexión
  options: {
    // Encriptación: FORZAR true para servidores en la nube, true por defecto
    // Si es servidor en la nube, siempre debe estar en true
    encrypt: isCloud ? true : (process.env.DB_ENCRYPT !== 'false'),
    // Trust certificate: true por defecto (necesario para servidores en la nube)
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== 'false',
    enableArithAbort: true,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT!),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT!),
  },
  
  // Pool de conexiones
  pool: {
    max: parseInt(process.env.DB_POOL_MAX!),
    min: parseInt(process.env.DB_POOL_MIN!),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT!),
  },
  
  // Logging
  logging: process.env.NODE_ENV === 'development' && process.env.DB_LOGGING === 'true',
  
  // Timezone
  timezone: process.env.DB_TIMEZONE!,
};

/**
 * Construye la connection string para SQL Server
 */
export function getConnectionString(): string {
  const { host, port, username, password, database, instance } = databaseConfig;
  
  let connectionString = `mssql://${username}:${password}@${host}:${port}/${database}`;
  
  if (instance) {
    connectionString += `\\${instance}`;
  }
  
  return connectionString;
}

/**
 * Valida que las variables de entorno requeridas estén configuradas
 */
export function validateDatabaseConfig(): { valid: boolean; missing: string[] } {
  const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missing: string[] = [];
  
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

