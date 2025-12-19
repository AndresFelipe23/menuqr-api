/**
 * Script para probar el envío de emails
 * Ejecutar con: bun run test:email
 */
import dotenv from 'dotenv';
import { initEmailTransport, getEmailTransport, EMAIL_FROM } from '../config/email.config';
import { emailService } from '../services/email.service';

// Cargar variables de entorno
dotenv.config();

async function testEmail() {
  console.log('🧪 Iniciando prueba de email...\n');

  // Verificar variables de entorno
  console.log('📋 Verificando configuración:');
  console.log(`   EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'NO CONFIGURADO'}`);
  console.log(`   EMAIL_FROM: ${EMAIL_FROM}`);
  
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    console.log(`   GMAIL_USER: ${process.env.GMAIL_USER ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ Configurado' : '❌ Faltante'}`);
  } else if (process.env.EMAIL_PROVIDER === 'sendgrid') {
    console.log(`   SENDGRID_SMTP_HOST: ${process.env.SENDGRID_SMTP_HOST ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   SENDGRID_SMTP_USER: ${process.env.SENDGRID_SMTP_USER ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   SENDGRID_SMTP_PASS: ${process.env.SENDGRID_SMTP_PASS ? '✅ Configurado' : '❌ Faltante'}`);
  } else {
    console.log('   ⚠️ EMAIL_PROVIDER no está configurado o es inválido');
  }

  console.log('\n🔧 Inicializando transporte de email...');
  const transport = initEmailTransport();
  
  if (!transport) {
    console.error('\n❌ ERROR: No se pudo inicializar el transporte de email');
    console.error('   Verifica que todas las variables de entorno estén configuradas correctamente.');
    process.exit(1);
  }

  console.log('✅ Transporte de email inicializado correctamente\n');

  // Obtener email de prueba desde argumentos o usar uno por defecto
  const testEmail = process.argv[2] || process.env.GMAIL_USER || 'test@example.com';
  
  console.log(`📧 Enviando email de prueba a: ${testEmail}`);
  console.log('   (Puedes especificar un email diferente: bun run test:email tu-email@example.com)\n');

  try {
    await emailService.enviarBienvenida({
      nombreUsuario: 'Usuario de Prueba',
      correoUsuario: testEmail,
      nombreRestaurante: 'Restaurante de Prueba',
      esAdministrador: true,
    });

    console.log('\n✅ Email enviado exitosamente!');
    console.log(`   Revisa la bandeja de entrada (y spam) de: ${testEmail}`);
  } catch (error) {
    console.error('\n❌ ERROR al enviar email:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testEmail().catch(console.error);

