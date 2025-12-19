/**
 * Configuración de Email usando Nodemailer
 * Soporta SendGrid SMTP y Gmail SMTP
 */
import nodemailer from 'nodemailer';

// Configuración del transporte de email
let transporter: nodemailer.Transporter | null = null;

/**
 * Inicializa el transporte de email según la configuración
 */
export function initEmailTransport() {
  const emailProvider = process.env.EMAIL_PROVIDER || 'sendgrid'; // 'sendgrid' o 'gmail'
  
  if (emailProvider === 'sendgrid') {
    // Configuración para SendGrid SMTP
    if (!process.env.SENDGRID_SMTP_HOST || !process.env.SENDGRID_SMTP_USER || !process.env.SENDGRID_SMTP_PASS) {
      console.warn('⚠️ SendGrid SMTP no está configurado. Variables requeridas: SENDGRID_SMTP_HOST, SENDGRID_SMTP_USER, SENDGRID_SMTP_PASS');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: process.env.SENDGRID_SMTP_HOST,
      port: parseInt(process.env.SENDGRID_SMTP_PORT || '587'),
      secure: process.env.SENDGRID_SMTP_SECURE === 'true', // true para 465, false para otros puertos
      auth: {
        user: process.env.SENDGRID_SMTP_USER,
        pass: process.env.SENDGRID_SMTP_PASS,
      },
    });
  } else if (emailProvider === 'gmail') {
    // Configuración para Gmail SMTP
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('⚠️ Gmail SMTP no está configurado. Variables requeridas: GMAIL_USER, GMAIL_APP_PASSWORD');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación, no la contraseña normal
      },
    });
  }

  return transporter;
}

/**
 * Obtiene el transporte de email (lo inicializa si es necesario)
 */
export function getEmailTransport(): nodemailer.Transporter | null {
  if (!transporter) {
    transporter = initEmailTransport();
  }
  return transporter;
}

/**
 * Email del remitente por defecto
 */
export const EMAIL_FROM = process.env.EMAIL_FROM || 'MenuQR <noreply@qrestaurante.site>';

/**
 * Nombre de la aplicación
 */
export const APP_NAME = process.env.APP_NAME || 'MenuQR';

