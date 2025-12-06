import { AppDataSource } from './database';
import { Logger } from '../utils/logger';
import { LogCategory } from '../utils/logger';

/**
 * Prueba la conexión a la base de datos
 * Útil para verificar que la configuración es correcta antes de iniciar el servidor
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { checkDatabaseConfig } = await import('./checkConfig');
    checkDatabaseConfig();
    
    console.log('\n🔌 Intentando conectar a la base de datos...');
    
    // Inicializar conexión
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Ejecutar una query simple para verificar la conexión
    // Usar corchetes para escapar palabras reservadas
    const result = await AppDataSource.query(`
      SELECT 
        @@VERSION as [version], 
        DB_NAME() as [db_name], 
        GETDATE() as serverTime,
        @@SERVERNAME as server_name
    `);
    
    console.log('✅ Conexión exitosa a la base de datos');
    if (result[0]) {
      console.log(`   Servidor SQL: ${(result[0].version as string)?.split('\n')[0] || 'N/A'}`);
      console.log(`   Nombre del servidor: ${result[0].server_name || 'N/A'}`);
      console.log(`   Base de datos: ${result[0].db_name || 'N/A'}`);
      console.log(`   Hora del servidor: ${result[0].serverTime || 'N/A'}`);
    }
    
    // Verificar que las tablas principales existen
    const tables = await AppDataSource.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log(`\n📊 Tablas encontradas: ${tables.length}`);
    if (tables.length > 0) {
      console.log('   Primeras 5 tablas:');
      tables.slice(0, 5).forEach((table: any) => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
      if (tables.length > 5) {
        console.log(`   ... y ${tables.length - 5} más`);
      }
    }
    
    // Log solo a consola, no a base de datos (evita logs repetitivos)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [INFO] [base_datos] Conexión a la base de datos verificada exitosamente');
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error('   Mensaje:', error.message);
    
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    
    // Errores comunes de SQL Server
    if (error.message?.includes('encrypt') || error.code === 'EENCRYPT') {
      console.error('\n💡 Solución: El servidor requiere encriptación SSL/TLS');
      console.error('   Agrega a tu archivo .env:');
      console.error('   DB_ENCRYPT=true');
      console.error('   DB_TRUST_CERTIFICATE=true');
    } else if (error.message?.includes('ECONNREFUSED')) {
      console.error('\n💡 Posibles soluciones:');
      console.error('   1. Verifica que SQL Server esté corriendo');
      console.error('   2. Verifica la dirección y puerto en .env');
      console.error('   3. Verifica que el puerto esté abierto');
    } else if (error.message?.includes('Login failed')) {
      console.error('\n💡 Posibles soluciones:');
      console.error('   1. Verifica el username y password en .env');
      console.error('   2. Verifica que la autenticación SQL esté habilitada');
    } else if (error.message?.includes('Cannot open database')) {
      console.error('\n💡 Posibles soluciones:');
      console.error('   1. Verifica que la base de datos "MenuQR" exista');
      console.error('   2. Ejecuta el script schema.sql para crear las tablas');
      console.error('   3. Verifica el nombre de la base de datos en .env');
    }
    
    Logger.error('Error al conectar a la base de datos', error as Error, {
      categoria: LogCategory.BASE_DATOS,
    });
    
    return false;
  }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeConnection(): Promise<void> {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Conexión a la base de datos cerrada correctamente');
    }
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error);
    throw error;
  }
}

