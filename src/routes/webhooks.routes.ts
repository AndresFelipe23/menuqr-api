import { Router, Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import { stripe } from '../config/stripe.config';
import { getWompiConfig } from '../config/wompi.config';
import { WompiService } from '../services/wompi.service';
import { AppDataSource } from '../config/database';
import { Logger, LogCategory } from '../utils/logger';
import { getMonteriaLocalDate } from '../utils/date.utils';

const router = Router();

/**
 * Webhook de Stripe para eventos de suscripciones y pagos
 * IMPORTANTE: Esta ruta NO debe usar el middleware de autenticación
 * Stripe verifica la firma del webhook
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    Logger.error('Webhook de Stripe: Firma o secreto faltante', new Error('Missing signature or secret'), {
      categoria: LogCategory.SISTEMA,
    });
    return res.status(400).send('Webhook Error: Missing signature or secret');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    Logger.error('Webhook de Stripe: Error al verificar firma', err instanceof Error ? err : new Error(String(err)), {
      categoria: LogCategory.SISTEMA,
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as any);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as any);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as any);
        break;

      default:
        Logger.info(`Webhook de Stripe: Evento no manejado: ${event.type}`, {
          categoria: LogCategory.SISTEMA,
        });
    }

    res.json({ received: true });
  } catch (error: any) {
    Logger.error('Error al procesar webhook de Stripe', error instanceof Error ? error : new Error(String(error)), {
      categoria: LogCategory.SISTEMA,
      eventType: event.type,
    });
    res.status(500).json({ error: 'Error al procesar webhook' });
  }
});

/**
 * Maneja actualizaciones de suscripción
 */
async function handleSubscriptionUpdate(subscription: any) {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = subscription.customer as string;
  const status = subscription.status;
  const currentPeriodStart = new Date(subscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  // Obtener el restaurante por customer ID
  const suscripcion = await AppDataSource.query(
    `SELECT * FROM suscripciones WHERE stripe_customer_id = @0`,
    [stripeCustomerId]
  );

  if (!suscripcion || suscripcion.length === 0) {
    Logger.warn('Webhook de Stripe: Suscripción no encontrada', {
      categoria: LogCategory.SISTEMA,
      stripeCustomerId,
      stripeSubscriptionId,
    });
    return;
  }

  const fechaActual = getMonteriaLocalDate();

  // Actualizar suscripción
  await AppDataSource.query(
    `UPDATE suscripciones 
     SET estado = @0, 
         inicio_periodo_actual = @1, 
         fin_periodo_actual = @2,
         fecha_actualizacion = @3
     WHERE stripe_subscription_id = @4`,
    [status, currentPeriodStart, currentPeriodEnd, fechaActual, stripeSubscriptionId]
  );

  // Actualizar estado en restaurante
  const estadoRestaurante = status === 'active' || status === 'trialing' ? 'active' : status;
  await AppDataSource.query(
    `UPDATE restaurantes SET estado_suscripcion = @0, fecha_actualizacion = @1 
     WHERE id = @2`,
    [estadoRestaurante, fechaActual, suscripcion[0].restaurante_id]
  );

  Logger.info('Webhook de Stripe: Suscripción actualizada', {
    categoria: LogCategory.SISTEMA,
    suscripcionId: suscripcion[0].id,
    estado: status,
  });
}

/**
 * Maneja cancelación de suscripción
 */
async function handleSubscriptionDeleted(subscription: any) {
  const stripeSubscriptionId = subscription.id;

  const suscripcion = await AppDataSource.query(
    `SELECT * FROM suscripciones WHERE stripe_subscription_id = @0`,
    [stripeSubscriptionId]
  );

  if (!suscripcion || suscripcion.length === 0) {
    return;
  }

  const fechaActual = getMonteriaLocalDate();

  await AppDataSource.query(
    `UPDATE suscripciones 
     SET estado = 'cancelled', 
         fecha_cancelacion = @0,
         fecha_actualizacion = @0
     WHERE stripe_subscription_id = @1`,
    [fechaActual, stripeSubscriptionId]
  );

  await AppDataSource.query(
    `UPDATE restaurantes SET estado_suscripcion = 'cancelled', fecha_actualizacion = @0 
     WHERE id = @1`,
    [fechaActual, suscripcion[0].restaurante_id]
  );

  Logger.info('Webhook de Stripe: Suscripción cancelada', {
    categoria: LogCategory.SISTEMA,
    suscripcionId: suscripcion[0].id,
  });
}

/**
 * Maneja pagos exitosos
 */
async function handlePaymentSucceeded(invoice: any) {
  const stripeInvoiceId = invoice.id;
  const stripeSubscriptionId = invoice.subscription;
  const amount = invoice.amount_paid / 100; // Convertir de centavos a dólares
  const currency = invoice.currency.toUpperCase();

  const suscripcion = await AppDataSource.query(
    `SELECT * FROM suscripciones WHERE stripe_subscription_id = @0`,
    [stripeSubscriptionId]
  );

  if (!suscripcion || suscripcion.length === 0) {
    return;
  }

  const fechaActual = getMonteriaLocalDate();
  const fechaPago = new Date(invoice.status_transitions.paid_at * 1000);

  // Crear registro de pago
  await AppDataSource.query(
    `INSERT INTO pagos (
      suscripcion_id, restaurante_id, monto, moneda,
      stripe_invoice_id, estado, fecha_pago, fecha_creacion
    )
    VALUES (@0, @1, @2, @3, @4, 'exitoso', @5, @6)`,
    [
      suscripcion[0].id,
      suscripcion[0].restaurante_id,
      amount,
      currency,
      stripeInvoiceId,
      fechaPago,
      fechaActual,
    ]
  );

  Logger.info('Webhook de Stripe: Pago registrado exitosamente', {
    categoria: LogCategory.SISTEMA,
    suscripcionId: suscripcion[0].id,
    monto: amount,
  });
}

/**
 * Maneja pagos fallidos
 */
async function handlePaymentFailed(invoice: any) {
  const stripeInvoiceId = invoice.id;
  const stripeSubscriptionId = invoice.subscription;

  const suscripcion = await AppDataSource.query(
    `SELECT * FROM suscripciones WHERE stripe_subscription_id = @0`,
    [stripeSubscriptionId]
  );

  if (!suscripcion || suscripcion.length === 0) {
    return;
  }

  const fechaActual = getMonteriaLocalDate();

  // Actualizar estado de suscripción a past_due
  await AppDataSource.query(
    `UPDATE suscripciones 
     SET estado = 'past_due', 
         fecha_actualizacion = @0
     WHERE stripe_subscription_id = @1`,
    [fechaActual, stripeSubscriptionId]
  );

  await AppDataSource.query(
    `UPDATE restaurantes SET estado_suscripcion = 'past_due', fecha_actualizacion = @0 
     WHERE id = @1`,
    [fechaActual, suscripcion[0].restaurante_id]
  );

  Logger.warn('Webhook de Stripe: Pago fallido', {
    categoria: LogCategory.SISTEMA,
    suscripcionId: suscripcion[0].id,
    stripeInvoiceId,
  });
}

/**
 * Webhook de Wompi para eventos de transacciones
 * IMPORTANTE: Esta ruta NO debe usar el middleware de autenticación
 * Wompi verifica la firma del webhook usando un evento.secret
 */
router.post('/wompi', express.json(), async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const signature = req.headers['signature'] as string;
    const { eventsSecret } = getWompiConfig();

    // Verificar firma del webhook usando el secreto de eventos
    // Wompi usa HMAC SHA256 para firmar los webhooks
    if (eventsSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', eventsSecret)
        .update(JSON.stringify(event))
        .digest('hex');
      
      // Comparar firmas de forma segura
      if (signature !== expectedSignature) {
        Logger.error('Webhook de Wompi: Firma inválida', new Error('Invalid signature'), {
          categoria: LogCategory.SISTEMA,
        });
        return res.status(401).send('Unauthorized - Invalid signature');
      }
    } else if (eventsSecret && !signature) {
      Logger.warn('Webhook de Wompi: Firma faltante pero secreto configurado', {
        categoria: LogCategory.SISTEMA,
      });
      // En desarrollo puedes permitir continuar, en producción deberías rechazar
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).send('Unauthorized - Missing signature');
      }
    }

    // Procesar evento según tipo
    switch (event.event) {
      case 'transaction.updated':
        await handleWompiTransactionUpdate(event.data);
        break;

      case 'transaction.status_changed':
        await handleWompiTransactionStatusChanged(event.data);
        break;

      default:
        Logger.info(`Webhook de Wompi: Evento no manejado: ${event.event}`, {
          categoria: LogCategory.SISTEMA,
        });
    }

    res.json({ received: true });
  } catch (error: any) {
    Logger.error('Error al procesar webhook de Wompi', error instanceof Error ? error : new Error(String(error)), {
      categoria: LogCategory.SISTEMA,
    });
    res.status(500).json({ error: 'Error al procesar webhook' });
  }
});

/**
 * Maneja actualizaciones de transacción de Wompi
 */
async function handleWompiTransactionUpdate(transaction: any) {
  const transactionId = transaction.id;
  const status = transaction.status;
  const amountInCents = transaction.amount_in_cents;
  const currency = transaction.currency;

  // Buscar suscripción por transaction ID (almacenado en stripe_subscription_id)
  const suscripcion = await AppDataSource.query(
    `SELECT * FROM suscripciones WHERE stripe_subscription_id = @0`,
    [transactionId]
  );

  if (!suscripcion || suscripcion.length === 0) {
    Logger.warn('Webhook de Wompi: Suscripción no encontrada para transacción', {
      categoria: LogCategory.SISTEMA,
      transactionId,
    });
    return;
  }

  const fechaActual = getMonteriaLocalDate();

  // Mapear estado de Wompi a nuestro estado
  let estadoSuscripcion = 'active';
  if (status === 'APPROVED') {
    estadoSuscripcion = 'active';
  } else if (status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR') {
    estadoSuscripcion = 'past_due';
  } else if (status === 'PENDING') {
    estadoSuscripcion = 'incomplete';
  }

  // Actualizar suscripción
  await AppDataSource.query(
    `UPDATE suscripciones 
     SET estado = @0, 
         fecha_actualizacion = @1
     WHERE stripe_subscription_id = @2`,
    [estadoSuscripcion, fechaActual, transactionId]
  );

  // Actualizar estado en restaurante
  await AppDataSource.query(
    `UPDATE restaurantes SET estado_suscripcion = @0, fecha_actualizacion = @1 
     WHERE id = @2`,
    [estadoSuscripcion, fechaActual, suscripcion[0].restaurante_id]
  );

  // Si el pago fue aprobado, registrar el pago
  if (status === 'APPROVED') {
    const amount = amountInCents / 100; // Convertir de centavos a pesos

    // Verificar si el pago ya existe
    const pagoExistente = await AppDataSource.query(
      `SELECT id FROM pagos WHERE stripe_payment_intent_id = @0`,
      [transactionId]
    );

    if (!pagoExistente || pagoExistente.length === 0) {
      const fechaPago = transaction.finalized_at
        ? new Date(transaction.finalized_at).toISOString().replace('T', ' ').slice(0, 23)
        : fechaActual;

      await AppDataSource.query(
        `INSERT INTO pagos (
          suscripcion_id, restaurante_id, monto, moneda,
          stripe_payment_intent_id, estado, fecha_pago, fecha_creacion
        )
        VALUES (@0, @1, @2, @3, @4, 'exitoso', @5, @6)`,
        [
          suscripcion[0].id,
          suscripcion[0].restaurante_id,
          amount,
          currency.toUpperCase(),
          transactionId,
          fechaPago,
          fechaActual,
        ]
      );

      Logger.info('Webhook de Wompi: Pago registrado exitosamente', {
        categoria: LogCategory.SISTEMA,
        suscripcionId: suscripcion[0].id,
        monto: amount,
      });
    }
  }

  Logger.info('Webhook de Wompi: Transacción actualizada', {
    categoria: LogCategory.SISTEMA,
    suscripcionId: suscripcion[0].id,
    estado: status,
  });
}

/**
 * Maneja cambios de estado de transacción de Wompi
 */
async function handleWompiTransactionStatusChanged(transaction: any) {
  await handleWompiTransactionUpdate(transaction);
}

export default router;

