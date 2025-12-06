import { databaseConfig } from './database.config';

/**
 * Verifica y muestra la configuración de la base de datos
 * Útil para debugging
 */
export function checkDatabaseConfig(): void {
  console.log('\n📋 Configuración de Base de Datos:');
  console.log(`   Host: ${databaseConfig.host}`);
  console.log(`   Port: ${databaseConfig.port}`);
  console.log(`   Database: ${databaseConfig.database}`);
  console.log(`   Username: ${databaseConfig.username}`);
  console.log(`   Encrypt: ${databaseConfig.options.encrypt}`);
  console.log(`   Trust Certificate: ${databaseConfig.options.trustServerCertificate}`);
  
  // Advertencias
  if (databaseConfig.host.includes('cloud') && !databaseConfig.options.encrypt) {
    console.warn('\n⚠️  ADVERTENCIA: Servidor en la nube detectado pero encriptación está deshabilitada!');
    console.warn('   Agrega a tu .env: DB_ENCRYPT=true');
  }
  
  if (!databaseConfig.password) {
    console.warn('\n⚠️  ADVERTENCIA: Password de base de datos no configurado!');
  }
}

