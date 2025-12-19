import { Router, Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import { stripe } from '../config/stripe.config';
import { getWompiConfig, WOMPI_PLAN_PRICES } from '../config/wompi.config';
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
      detalle: { eventType: event.type },
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
      detalle: { stripeCustomerId, stripeSubscriptionId },
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
    detalle: { suscripcionId: suscripcion[0].id, estado: status },
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
    detalle: { suscripcionId: suscripcion[0].id },
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
    detalle: { suscripcionId: suscripcion[0].id, monto: amount },
  });

  // Enviar email de confirmación de pago
  try {
    const { emailService } = await import('../services/email.service');
    
    // Obtener información del restaurante
    const restaurante = await AppDataSource.query(
      `SELECT nombre, correo FROM restaurantes WHERE id = @0`,
      [suscripcion[0].restaurante_id]
    );

    if (restaurante && restaurante.length > 0 && restaurante[0].correo) {
      emailService.enviarConfirmacionPago({
        nombreRestaurante: restaurante[0].nombre || 'Restaurante',
        correoRestaurante: restaurante[0].correo,
        tipoPlan: suscripcion[0].tipo_plan,
        monto: amount,
        moneda: currency,
        fechaPago: fechaPago,
        transactionId: stripeInvoiceId,
        inicioPeriodo: suscripcion[0].inicio_periodo_actual,
        finPeriodo: suscripcion[0].fin_periodo_actual,
        proveedorPago: 'stripe',
      }).catch(err => {
        Logger.error('Error al enviar email de confirmación de pago', err instanceof Error ? err : new Error(String(err)), {
          categoria: LogCategory.SISTEMA,
          detalle: { suscripcionId: suscripcion[0].id },
        });
      });
    }
  } catch (err) {
    Logger.warn('No se pudo enviar email de confirmación de pago', {
      categoria: LogCategory.SISTEMA,
      detalle: { error: err instanceof Error ? err.message : String(err) },
    });
  }
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
    detalle: { suscripcionId: suscripcion[0].id, stripeInvoiceId },
  });
}

/**
 * Webhook de Wompi para eventos de transacciones
 * IMPORTANTE: Esta ruta NO debe usar el middleware de autenticación
 * Wompi verifica la firma del webhook usando WOMPI_EVENTS_SECRET
 * 
 * La URL de este webhook debe configurarse en Wompi en:
 * Desarrolladores > Seguimiento de Transacciones > URL de Eventos
 * Ejemplo: https://tudominio.com/api/webhooks/wompi
 */
router.post('/wompi', express.json(), async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    // Wompi puede enviar la firma en diferentes headers según la versión
    // Verificar en 'signature' o 'x-signature'
    const signature = (req.headers['signature'] || req.headers['x-signature']) as string;
    const { eventsSecret } = getWompiConfig();

    Logger.info('Webhook de Wompi recibido', {
      categoria: LogCategory.SISTEMA,
      detalle: { 
        event: event.event || event.data?.status, 
        hasSignature: !!signature,
        hasEventsSecret: !!eventsSecret,
        eventBody: JSON.stringify(event).substring(0, 1000), // Primeros 1000 caracteres para debugging
        headers: JSON.stringify(req.headers).substring(0, 500)
      },
    });

    // Verificar firma del webhook usando el secreto de eventos
    // Wompi usa HMAC SHA256 para firmar los webhooks
    // La firma se calcula sobre el cuerpo completo del request
    if (eventsSecret && signature) {
      // Crear el payload como string para calcular la firma
      const payload = JSON.stringify(event);
      const expectedSignature = crypto
        .createHmac('sha256', eventsSecret)
        .update(payload)
        .digest('hex');
      
      // Comparar firmas de forma segura (timing-safe comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
      
      if (!isValid) {
        Logger.error('Webhook de Wompi: Firma inválida', new Error('Invalid signature'), {
          categoria: LogCategory.SISTEMA,
          detalle: { 
            received: signature.substring(0, 20) + '...',
            expected: expectedSignature.substring(0, 20) + '...'
          },
        });
        return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
      }
    } else if (eventsSecret && !signature) {
      Logger.warn('Webhook de Wompi: Firma faltante pero secreto configurado', {
        categoria: LogCategory.SISTEMA,
      });
      // En producción rechazar si no hay firma
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized - Missing signature' });
      }
    }

    // Procesar evento según tipo
    // Wompi puede enviar eventos como 'transaction.created', 'transaction.updated', etc.
    const eventType = event.event || event.data?.status;
    
    if (event.data && eventType) {
      // Si viene como objeto con 'data', procesar la transacción
      await handleWompiTransactionUpdate(event.data);
    } else if (event.id && event.status) {
      // Si viene directamente como transacción
      await handleWompiTransactionUpdate(event);
    } else {
      Logger.info(`Webhook de Wompi: Evento no manejado`, {
        categoria: LogCategory.SISTEMA,
        detalle: { eventBody: event },
      });
    }

    res.json({ received: true, status: 'ok' });
  } catch (error: any) {
    Logger.error('Error al procesar webhook de Wompi', error instanceof Error ? error : new Error(String(error)), {
      categoria: LogCategory.SISTEMA,
      detalle: { body: req.body },
    });
    res.status(500).json({ error: 'Error al procesar webhook' });
  }
});

/**
 * Maneja actualizaciones de transacción de Wompi
 */
async function handleWompiTransactionUpdate(transaction: any) {
  const transactionId = transaction.id || transaction.data?.id;
  const status = transaction.status || transaction.data?.status;
  const amountInCents = transaction.amount_in_cents || transaction.data?.amount_in_cents;
  const currency = transaction.currency || transaction.data?.currency || 'COP';
  const reference = transaction.reference || transaction.data?.reference || transaction.reference_id || transaction.data?.reference_id;

  Logger.info('Procesando transacción de Wompi', {
    categoria: LogCategory.SISTEMA,
    detalle: { 
      transactionId, 
      status, 
      reference, 
      amountInCents,
      currency,
      transactionData: JSON.stringify(transaction).substring(0, 500) // Primeros 500 caracteres para debugging
    },
  });

  // Buscar suscripción por transaction ID o por referencia
  // El transactionId se almacena en stripe_subscription_id para Wompi también
  let suscripcion: any[] = [];
  
  if (transactionId) {
    suscripcion = await AppDataSource.query(
      `SELECT * FROM suscripciones WHERE stripe_subscription_id = @0`,
      [transactionId]
    );
  }
  
  // Si no se encuentra por transactionId, intentar buscar por referencia
  if ((!suscripcion || suscripcion.length === 0) && reference) {
    // La referencia puede tener formato: SUB_restauranteId_timestamp
    const restauranteIdMatch = reference.match(/SUB_([^_]+)/);
    if (restauranteIdMatch && restauranteIdMatch[1]) {
      const restauranteId = restauranteIdMatch[1];
      
      // Primero buscar suscripciones incomplete del restaurante (más recientes primero)
      suscripcion = await AppDataSource.query(
        `SELECT TOP 1 * FROM suscripciones 
         WHERE restaurante_id = @0 
           AND estado = 'incomplete'
           AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
         ORDER BY fecha_creacion DESC`,
        [restauranteId]
      );
      
      // Si no encuentra incomplete, buscar cualquier suscripción del restaurante
      if (!suscripcion || suscripcion.length === 0) {
        suscripcion = await AppDataSource.query(
          `SELECT TOP 1 * FROM suscripciones 
           WHERE restaurante_id = @0 
           ORDER BY fecha_creacion DESC`,
          [restauranteId]
        );
      }
      
      if (suscripcion && suscripcion.length > 0) {
        Logger.info('Suscripción encontrada por referencia', {
          categoria: LogCategory.SISTEMA,
          detalle: { 
            referencia: reference,
            restauranteId: restauranteId,
            suscripcionId: suscripcion[0].id,
            estado: suscripcion[0].estado,
            tipoPlan: suscripcion[0].tipo_plan
          },
        });
      }
    }
  }

  // Si aún no se encuentra, intentar buscar por monto y tipo de plan
  // Los payment links de Wompi pueden no incluir referencia, pero podemos identificar por el monto
  if ((!suscripcion || suscripcion.length === 0) && amountInCents) {
    const amountInCOP = amountInCents / 100;
    
    // Identificar el plan por el monto usando los precios configurados
    // PRO mensual: $20,000 COP
    // PREMIUM mensual: $35,000 COP
    let tipoPlanEsperado: 'pro' | 'premium' | null = null;
    const precioPro = WOMPI_PLAN_PRICES.pro.monthly;
    const precioPremium = WOMPI_PLAN_PRICES.premium.monthly;
    
    // Tolerancia de 2000 COP para variaciones en el monto (puede haber pequeñas diferencias)
    if (Math.abs(amountInCOP - precioPro) < 2000) {
      tipoPlanEsperado = 'pro';
    } else if (Math.abs(amountInCOP - precioPremium) < 2000) {
      tipoPlanEsperado = 'premium';
    }
    
    if (tipoPlanEsperado) {
      Logger.info('Intentando identificar suscripción por monto', {
        categoria: LogCategory.SISTEMA,
        detalle: { amountInCOP, tipoPlanEsperado, transactionId, reference },
      });
      
      // Buscar suscripciones incompletas del plan esperado, ordenadas por fecha más reciente
      // Priorizar las que no tienen stripe_subscription_id asignado aún
      suscripcion = await AppDataSource.query(
        `SELECT TOP 1 * FROM suscripciones 
         WHERE tipo_plan = @0 
           AND estado = 'incomplete'
           AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
         ORDER BY fecha_creacion DESC`,
        [tipoPlanEsperado]
      );
      
      // Si no encuentra sin transactionId, buscar cualquier incomplete del plan
      if (!suscripcion || suscripcion.length === 0) {
        suscripcion = await AppDataSource.query(
          `SELECT TOP 1 * FROM suscripciones 
           WHERE tipo_plan = @0 
             AND estado = 'incomplete'
           ORDER BY fecha_creacion DESC`,
          [tipoPlanEsperado]
        );
      }
      
      // Si se encuentra, actualizar con el transactionId para futuras búsquedas
      if (suscripcion && suscripcion.length > 0) {
        Logger.info('Suscripción encontrada por monto', {
          categoria: LogCategory.SISTEMA,
          detalle: { 
            suscripcionId: suscripcion[0].id,
            restauranteId: suscripcion[0].restaurante_id,
            tipoPlan: suscripcion[0].tipo_plan,
            estado: suscripcion[0].estado,
            transactionId 
          },
        });
        
        // Actualizar el stripe_subscription_id con el transactionId ANTES de procesar el pago
        // Esto asegura que futuras búsquedas encuentren esta suscripción
        await AppDataSource.query(
          `UPDATE suscripciones SET stripe_subscription_id = @0 WHERE id = @1`,
          [transactionId, suscripcion[0].id]
        );
      }
    }
  }

  if (!suscripcion || suscripcion.length === 0) {
    Logger.warn('Webhook de Wompi: Suscripción no encontrada para transacción', {
      categoria: LogCategory.SISTEMA,
      detalle: { transactionId, reference, amountInCents },
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

  // Primero, asegurar que el transactionId esté guardado en la suscripción
  // Esto es importante para futuras búsquedas y para evitar duplicados
  const suscripcionActual = suscripcion[0];
  
  // Si el pago fue aprobado, activar la suscripción
  if (status === 'APPROVED' || status === 'APPROVED_PARTIAL') {
    const amount = amountInCents ? amountInCents / 100 : 0; // Convertir de centavos a pesos

    // Los planes son mensuales, así que siempre calcular 1 mes
    const isAnnual = false; // Siempre mensual
    const fechaActualDate = new Date(fechaActual);
    const finPeriodoDate = new Date(fechaActualDate);
    finPeriodoDate.setMonth(finPeriodoDate.getMonth() + 1); // 1 mes
    const finPeriodoStr = finPeriodoDate.toISOString().replace('T', ' ').slice(0, 23);

    // Actualizar la suscripción a estado active con todos los datos necesarios
    await AppDataSource.query(
      `UPDATE suscripciones 
       SET estado = 'active',
           stripe_subscription_id = @0,
           inicio_periodo_actual = @1,
           fin_periodo_actual = @2,
           fecha_actualizacion = @3
       WHERE id = @4`,
      [transactionId, fechaActualDate.toISOString().replace('T', ' ').slice(0, 23), finPeriodoStr, fechaActual, suscripcionActual.id]
    );

    // Actualizar estado del restaurante
    await AppDataSource.query(
      `UPDATE restaurantes SET estado_suscripcion = 'active', fecha_actualizacion = @0 
       WHERE id = @1`,
      [fechaActual, suscripcionActual.restaurante_id]
    );

    Logger.info('Webhook de Wompi: Suscripción activada desde incomplete/pending', {
      categoria: LogCategory.SISTEMA,
      detalle: { 
        suscripcionId: suscripcionActual.id,
        restauranteId: suscripcionActual.restaurante_id,
        tipoPlan: suscripcionActual.tipo_plan,
        transactionId,
        monto: amount 
      },
    });

    // Verificar si el pago ya existe antes de crear uno nuevo
    const pagoExistente = await AppDataSource.query(
      `SELECT id FROM pagos WHERE stripe_payment_intent_id = @0`,
      [transactionId]
    );

    if (!pagoExistente || pagoExistente.length === 0) {
      const fechaPago = (transaction.finalized_at || transaction.data?.finalized_at)
        ? new Date(transaction.finalized_at || transaction.data?.finalized_at).toISOString().replace('T', ' ').slice(0, 23)
        : fechaActual;

      await AppDataSource.query(
        `INSERT INTO pagos (
          suscripcion_id, restaurante_id, monto, moneda,
          stripe_payment_intent_id, estado, fecha_pago, fecha_creacion
        )
        VALUES (@0, @1, @2, @3, @4, 'exitoso', @5, @6)`,
        [
          suscripcionActual.id,
          suscripcionActual.restaurante_id,
          amount,
          currency.toUpperCase(),
          transactionId,
          fechaPago,
          fechaActual,
        ]
      );

      Logger.info('Webhook de Wompi: Pago registrado exitosamente', {
        categoria: LogCategory.SISTEMA,
        detalle: { suscripcionId: suscripcionActual.id, monto: amount, transactionId },
      });

      // Enviar email de confirmación de pago
      try {
        const { emailService } = await import('../services/email.service');
        
        // Obtener información del restaurante
        const restaurante = await AppDataSource.query(
          `SELECT nombre, correo FROM restaurantes WHERE id = @0`,
          [suscripcionActual.restaurante_id]
        );

        if (restaurante && restaurante.length > 0 && restaurante[0].correo) {
          emailService.enviarConfirmacionPago({
            nombreRestaurante: restaurante[0].nombre || 'Restaurante',
            correoRestaurante: restaurante[0].correo,
            tipoPlan: suscripcionActual.tipo_plan,
            monto: amount,
            moneda: currency.toUpperCase(),
            fechaPago: fechaPago,
            transactionId: transactionId,
            inicioPeriodo: fechaActualDate.toISOString().replace('T', ' ').slice(0, 23),
            finPeriodo: finPeriodoStr,
            proveedorPago: 'wompi',
          }).catch(err => {
            Logger.error('Error al enviar email de confirmación de pago', err instanceof Error ? err : new Error(String(err)), {
              categoria: LogCategory.SISTEMA,
              detalle: { suscripcionId: suscripcionActual.id },
            });
          });
        }
      } catch (err) {
        Logger.warn('No se pudo enviar email de confirmación de pago', {
          categoria: LogCategory.SISTEMA,
          detalle: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }
  } else {
    // Si el pago NO fue aprobado, solo actualizar el estado sin activar
    await AppDataSource.query(
      `UPDATE suscripciones 
       SET estado = @0, 
           stripe_subscription_id = @1,
           fecha_actualizacion = @2
       WHERE id = @3`,
      [estadoSuscripcion, transactionId, fechaActual, suscripcionActual.id]
    );

    // Actualizar estado en restaurante
    await AppDataSource.query(
      `UPDATE restaurantes SET estado_suscripcion = @0, fecha_actualizacion = @1 
       WHERE id = @2`,
      [estadoSuscripcion, fechaActual, suscripcionActual.restaurante_id]
    );
  }

  Logger.info('Webhook de Wompi: Transacción procesada', {
    categoria: LogCategory.SISTEMA,
    detalle: { suscripcionId: suscripcionActual.id, estado: status, nuevoEstado: status === 'APPROVED' ? 'active' : estadoSuscripcion },
  });
}

/**
 * Maneja cambios de estado de transacción de Wompi
 */
async function handleWompiTransactionStatusChanged(transaction: any) {
  await handleWompiTransactionUpdate(transaction);
}

export default router;

