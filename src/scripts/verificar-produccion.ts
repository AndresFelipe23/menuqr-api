/**
 * Script para verificar que el backend está listo para producción
 * Uso: bun run tsx src/scripts/verificar-produccion.ts
 * o: npm run verify:production
 */
import dotenv from 'dotenv';
import { validateDatabaseConfig, databaseConfig } from '../config/database.config';
import { checkDatabaseConfig } from '../config/checkConfig';
import { getWompiConfig } from '../config/wompi.config';

dotenv.config();

console.log('\n🔍 Verificando configuración para producción...\n');

const errors: string[] = [];
const warnings: string[] = [];

// 1. Verificar NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  warnings.push('⚠️  NODE_ENV no está configurado como "production"');
} else {
  console.log('✅ NODE_ENV: production');
}

// 2. Verificar variables de base de datos
const dbValidation = validateDatabaseConfig();
if (!dbValidation.valid) {
  errors.push(`❌ Variables de base de datos faltantes: ${dbValidation.missing.join(', ')}`);
} else {
  console.log('✅ Variables de base de datos configuradas');
  checkDatabaseConfig();
}

// 3. Verificar DB_ENCRYPT y DB_TRUST_CERTIFICATE
if (process.env.DB_ENCRYPT !== 'true') {
  warnings.push('⚠️  DB_ENCRYPT debería ser "true" para servidores en la nube');
}
if (process.env.DB_TRUST_CERTIFICATE !== 'true') {
  warnings.push('⚠️  DB_TRUST_CERTIFICATE debería ser "true" para servidores en la nube');
}

// 4. Verificar JWT Secrets
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  errors.push('❌ JWT_SECRET debe tener al menos 32 caracteres');
} else {
  console.log('✅ JWT_SECRET configurado');
}

if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  errors.push('❌ JWT_REFRESH_SECRET debe tener al menos 32 caracteres');
} else {
  console.log('✅ JWT_REFRESH_SECRET configurado');
}

// 5. Verificar API_URL
if (!process.env.API_URL || !process.env.API_URL.startsWith('https://')) {
  warnings.push('⚠️  API_URL debería usar HTTPS en producción');
} else {
  console.log(`✅ API_URL: ${process.env.API_URL}`);
}

// 6. Verificar CORS
if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
  warnings.push('⚠️  CORS_ORIGIN no debería incluir localhost en producción');
} else {
  console.log(`✅ CORS_ORIGIN configurado`);
}

// 7. Verificar Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  warnings.push('⚠️  STRIPE_SECRET_KEY no está configurado');
} else if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  warnings.push('⚠️  STRIPE_SECRET_KEY es de test. Cambia a producción (sk_live_...) cuando estés listo');
  console.log('✅ STRIPE_SECRET_KEY configurado (test - OK para pruebas)');
} else if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  console.log('✅ STRIPE_SECRET_KEY configurado (producción)');
} else {
  console.log('✅ STRIPE_SECRET_KEY configurado');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  warnings.push('⚠️  STRIPE_WEBHOOK_SECRET no está configurado');
} else {
  console.log('✅ STRIPE_WEBHOOK_SECRET configurado');
}

// 8. Verificar Wompi
try {
  const wompiConfig = getWompiConfig();
  if (wompiConfig.environment === 'sandbox') {
    warnings.push('⚠️  WOMPI_ENVIRONMENT está en "sandbox". Cambia a "production" cuando estés listo');
    console.log('✅ WOMPI_ENVIRONMENT: sandbox (OK para pruebas)');
  } else if (wompiConfig.environment === 'production') {
    console.log('✅ WOMPI_ENVIRONMENT: production');
  }

  if (!wompiConfig.publicKey) {
    warnings.push('⚠️  WOMPI_PUBLIC_KEY no está configurado');
  } else if (wompiConfig.publicKey?.startsWith('pub_test_')) {
    warnings.push('⚠️  WOMPI_PUBLIC_KEY es de test. Cambia a producción (pub_prod_...) cuando estés listo');
    console.log('✅ WOMPI_PUBLIC_KEY configurado (test - OK para pruebas)');
  } else if (wompiConfig.publicKey?.startsWith('pub_prod_')) {
    console.log('✅ WOMPI_PUBLIC_KEY configurado (producción)');
  } else {
    console.log('✅ WOMPI_PUBLIC_KEY configurado');
  }

  if (!wompiConfig.eventsSecret) {
    warnings.push('⚠️  WOMPI_EVENTS_SECRET no está configurado');
  } else {
    console.log('✅ WOMPI_EVENTS_SECRET configurado');
  }

  if (!wompiConfig.integritySecret) {
    warnings.push('⚠️  WOMPI_INTEGRITY_SECRET no está configurado');
  } else {
    console.log('✅ WOMPI_INTEGRITY_SECRET configurado');
  }
} catch (error: any) {
  warnings.push(`⚠️  Error al verificar configuración de Wompi: ${error.message}`);
}

// 9. Verificar Payment Links de Wompi
const requiredPaymentLinks = [
  'WOMPI_PAYMENT_LINK_PRO_MONTHLY',
  'WOMPI_PAYMENT_LINK_PRO_ANNUAL',
  'WOMPI_PAYMENT_LINK_PREMIUM_MONTHLY',
  'WOMPI_PAYMENT_LINK_PREMIUM_ANNUAL',
];

const missingPaymentLinks = requiredPaymentLinks.filter(
  (key) => !process.env[key] || process.env[key] === ''
);

if (missingPaymentLinks.length > 0) {
  warnings.push(`⚠️  Links de pago faltantes: ${missingPaymentLinks.join(', ')}`);
} else {
  console.log('✅ Links de pago de Wompi configurados');
}

// 10. Verificar Firebase
if (!process.env.FIREBASE_PROJECT_ID) {
  warnings.push('⚠️  FIREBASE_PROJECT_ID no está configurado');
} else {
  console.log('✅ FIREBASE_PROJECT_ID configurado');
}

// 11. Verificar FRONTEND_CLIENTE_URL
if (!process.env.FRONTEND_CLIENTE_URL || !process.env.FRONTEND_CLIENTE_URL.startsWith('https://')) {
  warnings.push('⚠️  FRONTEND_CLIENTE_URL debería usar HTTPS');
} else {
  console.log(`✅ FRONTEND_CLIENTE_URL: ${process.env.FRONTEND_CLIENTE_URL}`);
}

// Mostrar resultados
console.log('\n' + '='.repeat(60));

if (errors.length > 0) {
  console.log('\n❌ ERRORES CRÍTICOS (deben corregirse antes de producción):\n');
  errors.forEach((error) => console.log(`  ${error}`));
  console.log('');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('\n⚠️  ADVERTENCIAS (revisar antes de producción):\n');
  warnings.forEach((warning) => console.log(`  ${warning}`));
  console.log('');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ ¡Todo está configurado correctamente!\n');
} else if (errors.length === 0) {
  console.log('\n✅ Configuración válida para desplegar con credenciales de test.\n');
  console.log('💡 Cuando estés listo para producción, cambia las credenciales de test a producción.\n');
}

console.log('='.repeat(60) + '\n');

