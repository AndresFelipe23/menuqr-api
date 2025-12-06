#!/usr/bin/env ts-node
/**
 * Script para probar la conexión a la base de datos
 * Uso: bun run tsx src/scripts/test-db.ts
 * o: npm run test:db
 */

import 'reflect-metadata';
import dotenv from 'dotenv';
import { testConnection, closeConnection } from '../config/testConnection';

// Cargar variables de entorno
dotenv.config();

async function main() {
  console.log('🧪 Probando conexión a la base de datos...\n');
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n✅ Prueba de conexión exitosa');
    await closeConnection();
    process.exit(0);
  } else {
    console.log('\n❌ Prueba de conexión fallida');
    await closeConnection();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error inesperado:', error);
  process.exit(1);
});

