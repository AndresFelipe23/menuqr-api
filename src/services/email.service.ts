/**
 * Servicio de envío de emails usando Nodemailer
 */
import { getEmailTransport, EMAIL_FROM, APP_NAME } from '../config/email.config';
import { Logger, LogCategory } from '../utils/logger';

export interface ConfirmacionReservaEmail {
  nombreCliente: string;
  correoCliente: string;
  nombreRestaurante: string;
  fechaReserva: Date | string;
  numeroPersonas: number;
  mesaNumero: string;
  codigoConfirmacion: string;
  notasCliente?: string | null;
}

export interface NuevaReservaRestauranteEmail {
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  nombreRestaurante: string;
  fechaReserva: Date | string;
  numeroPersonas: number;
  mesaNumero: string;
  notasCliente?: string | null;
}

export interface BienvenidaEmail {
  nombreUsuario: string;
  correoUsuario: string;
  nombreRestaurante?: string | null;
  esAdministrador?: boolean;
}

export interface ConfirmacionPagoEmail {
  nombreRestaurante: string;
  correoRestaurante: string;
  tipoPlan: string;
  monto: number;
  moneda: string;
  fechaPago: Date | string;
  transactionId: string;
  inicioPeriodo?: Date | string | null;
  finPeriodo?: Date | string | null;
  proveedorPago: 'stripe' | 'wompi';
}

export class EmailService {
  private logCategory = LogCategory.SISTEMA;

  /**
   * Envía un email genérico
   */
  async enviarEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    const transporter = getEmailTransport();
    
    if (!transporter) {
      const errorMsg = 'No se puede enviar email: transporte no configurado. Verifica EMAIL_PROVIDER y las variables de entorno.';
      Logger.error(
        errorMsg,
        new Error('Email transport not configured'),
        {
          categoria: this.logCategory,
          detalle: { 
            to, 
            subject,
            emailProvider: process.env.EMAIL_PROVIDER || 'no configurado',
            hasGmailUser: !!process.env.GMAIL_USER,
            hasGmailPass: !!process.env.GMAIL_APP_PASSWORD,
            hasSendGridHost: !!process.env.SENDGRID_SMTP_HOST,
            hasSendGridUser: !!process.env.SENDGRID_SMTP_USER,
            hasSendGridPass: !!process.env.SENDGRID_SMTP_PASS,
          },
        }
      );
      console.error('❌ ERROR DE EMAIL:', errorMsg);
      console.error('   Variables de entorno:', {
        EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'no configurado',
        GMAIL_USER: process.env.GMAIL_USER ? 'configurado' : 'faltante',
        GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? 'configurado' : 'faltante',
      });
      throw new Error(errorMsg);
    }

    try {
      console.log(`📧 Intentando enviar email a: ${to}`);
      console.log(`   Asunto: ${subject}`);
      
      const info = await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text: text || this.htmlToText(html),
        html,
      });

      console.log(`✅ Email enviado exitosamente a: ${to}`);
      console.log(`   Message ID: ${info.messageId}`);

      Logger.info('Email enviado exitosamente', {
        categoria: this.logCategory,
        detalle: {
          to,
          subject,
          messageId: info.messageId,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ ERROR al enviar email a: ${to}`);
      console.error(`   Error: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }

      Logger.error(
        'Error al enviar email',
        error instanceof Error ? error : new Error(String(error)),
        {
          categoria: this.logCategory,
          detalle: {
            to,
            subject,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
        }
      );
      throw error;
    }
  }

  /**
   * Envía email de confirmación de reserva al cliente
   */
  async enviarConfirmacionReserva(data: ConfirmacionReservaEmail): Promise<void> {
    const fechaFormateada = this.formatearFecha(data.fechaReserva);
    const horaFormateada = this.formatearHora(data.fechaReserva);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Reserva</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Reserva Confirmada</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${this.escapeHtml(data.nombreCliente)}</strong>,</p>
    
    <p>Tu reserva en <strong>${this.escapeHtml(data.nombreRestaurante)}</strong> ha sido confirmada exitosamente.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea;">Detalles de tu Reserva</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">📅 Fecha:</td>
          <td style="padding: 8px 0;">${fechaFormateada}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Hora:</td>
          <td style="padding: 8px 0;">${horaFormateada}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">👥 Personas:</td>
          <td style="padding: 8px 0;">${data.numeroPersonas}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🪑 Mesa:</td>
          <td style="padding: 8px 0;">${this.escapeHtml(data.mesaNumero)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🔐 Código:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 18px; color: #667eea; font-weight: bold;">${this.escapeHtml(data.codigoConfirmacion)}</td>
        </tr>
      </table>
    </div>

    ${data.notasCliente ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0;"><strong>📝 Notas especiales:</strong></p>
      <p style="margin: 5px 0 0 0;">${this.escapeHtml(data.notasCliente)}</p>
    </div>
    ` : ''}

    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
      <p style="margin: 0; font-size: 14px;">
        <strong>💡 Recordatorio:</strong> Guarda este código de confirmación. Lo necesitarás al llegar al restaurante.
      </p>
    </div>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Si tienes alguna pregunta o necesitas modificar tu reserva, por favor contacta al restaurante directamente.
    </p>

    <p style="margin-top: 20px;">
      ¡Esperamos verte pronto!<br>
      <strong>${this.escapeHtml(data.nombreRestaurante)}</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>Este es un email automático, por favor no respondas a este mensaje.</p>
    <p>© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
  </div>
</body>
</html>
    `;

    await this.enviarEmail(
      data.correoCliente,
      `✅ Reserva Confirmada - ${data.nombreRestaurante}`,
      html
    );
  }

  /**
   * Envía notificación al restaurante sobre una nueva reserva
   */
  async enviarNuevaReservaRestaurante(
    data: NuevaReservaRestauranteEmail,
    emailRestaurante: string
  ): Promise<void> {
    const fechaFormateada = this.formatearFecha(data.fechaReserva);
    const horaFormateada = this.formatearHora(data.fechaReserva);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Reserva</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Nueva Reserva</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <p style="font-size: 18px; margin-bottom: 20px;">Hola,</p>
    
    <p>Has recibido una nueva solicitud de reserva para <strong>${this.escapeHtml(data.nombreRestaurante)}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
      <h2 style="margin-top: 0; color: #f5576c;">Detalles de la Reserva</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 40%;">👤 Cliente:</td>
          <td style="padding: 8px 0;">${this.escapeHtml(data.nombreCliente)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📧 Email:</td>
          <td style="padding: 8px 0;">${this.escapeHtml(data.correoCliente)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📱 Teléfono:</td>
          <td style="padding: 8px 0;">${this.escapeHtml(data.telefonoCliente)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📅 Fecha:</td>
          <td style="padding: 8px 0;">${fechaFormateada}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Hora:</td>
          <td style="padding: 8px 0;">${horaFormateada}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">👥 Personas:</td>
          <td style="padding: 8px 0;">${data.numeroPersonas}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🪑 Mesa:</td>
          <td style="padding: 8px 0;">${this.escapeHtml(data.mesaNumero)}</td>
        </tr>
      </table>
    </div>

    ${data.notasCliente ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0;"><strong>📝 Notas del cliente:</strong></p>
      <p style="margin: 5px 0 0 0;">${this.escapeHtml(data.notasCliente)}</p>
    </div>
    ` : ''}

    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Acción requerida:</strong> Por favor revisa y confirma esta reserva desde tu panel de administración.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>Este es un email automático del sistema ${APP_NAME}.</p>
  </div>
</body>
</html>
    `;

    await this.enviarEmail(
      emailRestaurante,
      `🔔 Nueva Reserva - ${data.nombreCliente}`,
      html
    );
  }

  /**
   * Convierte HTML a texto plano
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Escapa HTML para prevenir XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Formatea una fecha para mostrar
   */
  private formatearFecha(fecha: Date | string): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formatea una hora para mostrar
   */
  private formatearHora(fecha: Date | string): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Envía email de bienvenida a un nuevo usuario
   */
  async enviarBienvenida(data: BienvenidaEmail): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 48px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                ¡Bienvenido!
              </h1>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px 0; color: #1a202c; font-size: 18px; font-weight: 500;">
                Hola <strong style="color: #10B981;">${this.escapeHtml(data.nombreUsuario)}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                Nos complace darte la bienvenida a <strong style="color: #1a202c;">${APP_NAME}</strong>, la plataforma que transformará la forma en que gestionas tu restaurante.
              </p>

              ${data.nombreRestaurante ? `
              <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #10B981; padding: 20px; border-radius: 8px; margin: 32px 0;">
                <p style="margin: 0 0 8px 0; color: #2d3748; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Tu Restaurante
                </p>
                <p style="margin: 0; color: #1a202c; font-size: 20px; font-weight: 600;">
                  ${this.escapeHtml(data.nombreRestaurante)}
                </p>
              </div>
              ` : ''}

              <p style="margin: 24px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                Con ${APP_NAME} podrás:
              </p>

              <table role="presentation" style="width: 100%; margin: 24px 0;">
                <tr>
                  <td style="padding: 12px 0;">
                    <div style="display: flex; align-items: start;">
                      <span style="color: #10B981; font-size: 20px; font-weight: bold; margin-right: 16px; flex-shrink: 0; line-height: 1.2;">✓</span>
                      <p style="margin: 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                        Gestionar tu menú digital con códigos QR
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <div style="display: flex; align-items: start;">
                      <span style="color: #10B981; font-size: 20px; font-weight: bold; margin-right: 16px; flex-shrink: 0; line-height: 1.2;">✓</span>
                      <p style="margin: 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                        Administrar pedidos y reservas en tiempo real
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <div style="display: flex; align-items: start;">
                      <span style="color: #10B981; font-size: 20px; font-weight: bold; margin-right: 16px; flex-shrink: 0; line-height: 1.2;">✓</span>
                      <p style="margin: 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                        Optimizar la experiencia de tus clientes
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="margin: 40px 0; padding: 24px; background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 16px 0; color: #2d3748; font-size: 15px; font-weight: 500;">
                  ¿Listo para comenzar?
                </p>
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                  Inicia sesión en tu panel de administración y comienza a configurar tu restaurante.
                </p>
              </div>

              <p style="margin: 32px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">
                ${APP_NAME}
              </p>
              <p style="margin: 0; color: #718096; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.enviarEmail(
      data.correoUsuario,
      `¡Bienvenido a ${APP_NAME}!`,
      html
    );
  }

  /**
   * Envía email de confirmación de pago de suscripción
   */
  async enviarConfirmacionPago(data: ConfirmacionPagoEmail): Promise<void> {
    const fechaPagoFormateada = this.formatearFecha(data.fechaPago);
    const horaPagoFormateada = this.formatearHora(data.fechaPago);
    
    const nombrePlan = data.tipoPlan === 'pro' ? 'PRO' : data.tipoPlan === 'premium' ? 'PREMIUM' : data.tipoPlan.toUpperCase();
    const montoFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: data.moneda,
    }).format(data.monto);

    const proveedorNombre = data.proveedorPago === 'stripe' ? 'Stripe' : 'Wompi';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pago - ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 48px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                ✅ Pago Confirmado
              </h1>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px 0; color: #1a202c; font-size: 18px; font-weight: 500;">
                Hola <strong style="color: #10B981;">${this.escapeHtml(data.nombreRestaurante)}</strong>,
              </p>
              
              <p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                Tu pago ha sido procesado exitosamente. Tu suscripción está ahora activa.
              </p>

              <!-- Detalles del pago -->
              <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #10B981; padding: 24px; border-radius: 8px; margin: 32px 0;">
                <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; font-weight: 600;">
                  Detalles del Pago
                </h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 40%; color: #2d3748;">Plan:</td>
                    <td style="padding: 8px 0; color: #1a202c; font-weight: 600;">${nombrePlan}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #2d3748;">Monto:</td>
                    <td style="padding: 8px 0; color: #1a202c; font-weight: 600; font-size: 18px;">${montoFormateado}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #2d3748;">Fecha de Pago:</td>
                    <td style="padding: 8px 0; color: #1a202c;">${fechaPagoFormateada} a las ${horaPagoFormateada}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #2d3748;">ID de Transacción:</td>
                    <td style="padding: 8px 0; color: #4a5568; font-family: monospace; font-size: 13px;">${this.escapeHtml(data.transactionId)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #2d3748;">Proveedor:</td>
                    <td style="padding: 8px 0; color: #1a202c;">${proveedorNombre}</td>
                  </tr>
                </table>
              </div>

              ${data.inicioPeriodo && data.finPeriodo ? `
              <!-- Período de suscripción -->
              <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; color: #1a202c; font-size: 16px; font-weight: 600;">
                  📅 Período de Suscripción
                </h3>
                <p style="margin: 0; color: #2d3748; font-size: 15px;">
                  <strong>Inicio:</strong> ${this.formatearFecha(data.inicioPeriodo)}<br>
                  <strong>Fin:</strong> ${this.formatearFecha(data.finPeriodo)}
                </p>
              </div>
              ` : ''}

              <!-- Beneficios del plan -->
              <div style="margin: 32px 0;">
                <p style="margin: 0 0 16px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                  Con tu plan ${nombrePlan} tienes acceso a:
                </p>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10B981; font-size: 18px; font-weight: bold; margin-right: 12px;">✓</span>
                      <span style="color: #2d3748; font-size: 14px;">Menú digital con códigos QR</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10B981; font-size: 18px; font-weight: bold; margin-right: 12px;">✓</span>
                      <span style="color: #2d3748; font-size: 14px;">Gestión de pedidos en tiempo real</span>
                    </td>
                  </tr>
                  ${data.tipoPlan === 'premium' ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10B981; font-size: 18px; font-weight: bold; margin-right: 12px;">✓</span>
                      <span style="color: #2d3748; font-size: 14px;">Sistema de reservas</span>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #10B981; font-size: 18px; font-weight: bold; margin-right: 12px;">✓</span>
                      <span style="color: #2d3748; font-size: 14px;">Panel de administración completo</span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin: 40px 0; padding: 24px; background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #2d3748; font-size: 15px; line-height: 1.6;">
                  <strong>¡Gracias por confiar en ${APP_NAME}!</strong><br>
                  Si tienes alguna pregunta sobre tu suscripción, no dudes en contactarnos.
                </p>
              </div>

              <p style="margin: 32px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                Este es un recibo automático de tu pago. Guárdalo para tus registros.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px; font-weight: 500;">
                ${APP_NAME}
              </p>
              <p style="margin: 0; color: #718096; font-size: 12px;">
                © ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.enviarEmail(
      data.correoRestaurante,
      `✅ Confirmación de Pago - Plan ${nombrePlan}`,
      html
    );
  }
}

export const emailService = new EmailService();

