import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory, Logger } from '../utils/logger';
import { CrearSuscripcionDto, ActualizarSuscripcionDto } from '../dto';
import { stripe, SUBSCRIPTION_PLANS, PlanType, getPlanPrice } from '../config/stripe.config';
import { PaymentProvider, getWompiPlanPrice } from '../config/wompi.config';
import { WompiService } from './wompi.service';
import { getMonteriaLocalDate } from '../utils/date.utils';
import Stripe from 'stripe';

export interface Suscripcion {
  id: string;
  restauranteId: string;
  tipoPlan: PlanType;
  estado: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  inicioPeriodoActual: Date | null;
  finPeriodoActual: Date | null;
  cancelarAlFinPeriodo: boolean;
  fechaCancelacion: Date | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export class SuscripcionesService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Mapea un resultado de BD a la interfaz Suscripcion
   */
  private mapToSuscripcion(row: any): Suscripcion {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      tipoPlan: row.tipo_plan,
      estado: row.estado,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      inicioPeriodoActual: row.inicio_periodo_actual,
      finPeriodoActual: row.fin_periodo_actual,
      cancelarAlFinPeriodo: row.cancelar_al_fin_periodo === 1,
      fechaCancelacion: row.fecha_cancelacion,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene la suscripción de un restaurante
   */
  async obtenerPorRestauranteId(restauranteId: string): Promise<Suscripcion | null> {
    this.logOperation(`obtener suscripción por restaurante: ${restauranteId}`);

    const resultado = await AppDataSource.query(
      `SELECT * FROM suscripciones WHERE restaurante_id = @0`,
      [restauranteId]
    );

    if (!resultado || resultado.length === 0) {
      return null;
    }

    return this.mapToSuscripcion(resultado[0]);
  }

  /**
   * Crea una nueva suscripción
   */
  async crear(
    crearSuscripcionDto: CrearSuscripcionDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Suscripcion> {
    this.logOperation('crear suscripción', { data: crearSuscripcionDto, usuarioId });

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre, correo, telefono FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearSuscripcionDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Validar que el restaurante tiene email (requerido para Wompi)
    if (!restaurante[0].correo || !restaurante[0].correo.includes('@')) {
      this.handleError('Para procesar el pago, necesitas tener un correo electrónico válido configurado en tu perfil', null, 400);
    }

    // Validar que el restaurante tiene teléfono (recomendado pero no obligatorio)
    // Si no tiene teléfono, solo loguear advertencia
    if (crearSuscripcionDto.tipoPlan !== 'free' && (!restaurante[0].telefono || restaurante[0].telefono.length < 10)) {
      Logger.warn('El restaurante no tiene un teléfono válido configurado', {
        categoria: this.logCategory,
        detalle: { restauranteId: crearSuscripcionDto.restauranteId },
      });
    }

    // Verificar si ya existe una suscripción
    const suscripcionExistente = await this.obtenerPorRestauranteId(crearSuscripcionDto.restauranteId);
    
    // Si hay una suscripción incomplete, permitir crear una nueva
    // Esto puede pasar si un pago anterior no se completó
    if (suscripcionExistente && suscripcionExistente.estado === 'incomplete') {
      Logger.info('Existe suscripción incomplete, se creará una nueva', {
        categoria: this.logCategory,
        detalle: { 
          restauranteId: crearSuscripcionDto.restauranteId,
          suscripcionId: suscripcionExistente.id,
          estadoActual: suscripcionExistente.estado,
          planActual: suscripcionExistente.tipoPlan,
          planNuevo: crearSuscripcionDto.tipoPlan 
        },
      });
      // Permitir continuar con la creación de una nueva suscripción
      // La anterior quedará como incomplete y no afectará la nueva
    } else if (suscripcionExistente && suscripcionExistente.estado === 'active') {
      // Si ya tiene una suscripción activa y es un upgrade (de FREE a PRO/PREMIUM o de PRO a PREMIUM)
      // Actualizar la suscripción existente en lugar de crear una nueva
      // Si el plan nuevo es igual al actual, rechazar
      if (suscripcionExistente.tipoPlan === crearSuscripcionDto.tipoPlan) {
        this.handleError('Ya tienes una suscripción activa con este plan', null, 409);
      }
      
      // Si es un upgrade válido (FREE -> PRO/PREMIUM o PRO -> PREMIUM)
      const esUpgrade = (suscripcionExistente.tipoPlan === 'free' && (crearSuscripcionDto.tipoPlan === 'pro' || crearSuscripcionDto.tipoPlan === 'premium')) ||
                        (suscripcionExistente.tipoPlan === 'pro' && crearSuscripcionDto.tipoPlan === 'premium');
      
      if (!esUpgrade) {
        this.handleError('No puedes cambiar a un plan inferior. Cancela tu suscripción actual primero.', null, 409);
      }
      
      // Si es un upgrade válido, usar el método actualizar en lugar de crear
      // Pero primero necesitamos procesar el pago, así que continuamos con la creación
      // pero cancelaremos/actualizaremos la anterior después del pago exitoso
      // Por ahora, permitimos continuar pero cancelaremos la anterior
    }

    const fechaActual = getMonteriaLocalDate();
    const paymentProvider: PaymentProvider = crearSuscripcionDto.paymentProvider || 'stripe';
    let stripeSubscriptionId: string | null = null;
    let stripeCustomerId: string | null = null;
    let wompiTransactionId: string | null = null;
    let inicioPeriodo: string | null = null;
    let finPeriodo: string | null = null;
    let estado: 'active' | 'trialing' | 'incomplete' = 'active';

    // Si es free, crear directamente en BD (permanente, sin límite de tiempo)
    if (crearSuscripcionDto.tipoPlan === 'free') {
      inicioPeriodo = fechaActual;
      // Free es permanente, pero establecemos fin_periodo a 100 años en el futuro
      const finPeriodoDate = new Date(fechaActual);
      finPeriodoDate.setFullYear(finPeriodoDate.getFullYear() + 100);
      // Convertir a formato SQL Server (YYYY-MM-DD HH:mm:ss.sss)
      finPeriodo = finPeriodoDate.toISOString().replace('T', ' ').slice(0, 23);
      estado = 'active';
    } else {
      // Para planes de pago, crear según el proveedor elegido
      const isAnnual = crearSuscripcionDto.isAnnual || false;

      // Si no hay paymentMethodId y es Wompi, puede ser que se esté usando payment link
      // En ese caso, crear suscripción pendiente que se actualizará cuando llegue el webhook
      if (!crearSuscripcionDto.paymentMethodId && paymentProvider === 'wompi') {
        // Crear suscripción pendiente para payment link
        estado = 'incomplete';
        const fechaActualDate = new Date(fechaActual);
        inicioPeriodo = fechaActualDate.toISOString().replace('T', ' ').slice(0, 23);
        // Establecer fin de período temporal (se actualizará cuando se apruebe el pago)
        const finPeriodoDate = new Date(fechaActualDate);
        finPeriodoDate.setMonth(finPeriodoDate.getMonth() + (isAnnual ? 12 : 1));
        finPeriodo = finPeriodoDate.toISOString().replace('T', ' ').slice(0, 23);
        
        Logger.info('Creando suscripción pendiente para payment link de Wompi (sin llamadas externas)', {
          categoria: this.logCategory,
          detalle: { 
            restauranteId: crearSuscripcionDto.restauranteId, 
            plan: crearSuscripcionDto.tipoPlan,
            isAnnual: isAnnual,
            estado: 'incomplete'
          },
        });
        // Para payment links, saltar toda la lógica de pago externa
        // La suscripción se actualizará cuando llegue el webhook
      } else if (!crearSuscripcionDto.paymentMethodId) {
        this.handleError('Se requiere un método de pago para planes de pago', null, 400);
      } else {
        // Procesar pago con método de pago proporcionado
        try {
          if (paymentProvider === 'wompi') {
            // Procesar pago con Wompi
            const wompiService = new WompiService();
            
            // El paymentMethodId puede venir como JSON stringificado con los datos de la tarjeta
            // o como un token ya creado
            let tokenId: string = '';
            
            try {
              // Intentar parsear como JSON (si viene del frontend con datos de tarjeta)
              const parsedData = JSON.parse(crearSuscripcionDto.paymentMethodId || '');
              if (parsedData && parsedData.type === 'wompi' && parsedData.cardData) {
                // Crear token en Wompi con los datos de la tarjeta
                try {
                  tokenId = await wompiService.createToken(JSON.stringify(parsedData.cardData));
                  
                  // Validar que el token obtenido sea válido (no debe ser el JSON original)
                  if (!tokenId || tokenId.trim().startsWith('{')) {
                    Logger.error('Token obtenido de Wompi es inválido', new Error('Token inválido'), {
                      categoria: this.logCategory,
                      detalle: {
                        tokenId: tokenId?.substring(0, 50) || 'undefined',
                        tokenLength: tokenId?.length || 0,
                      },
                    });
                    this.handleError('Error al generar el token de la tarjeta. Por favor, verifica los datos e intenta nuevamente.', null, 400);
                  }
                } catch (tokenError: any) {
                  // Si falla la creación del token, no continuar
                  Logger.error('Error al crear token en Wompi', tokenError instanceof Error ? tokenError : new Error(String(tokenError)), {
                    categoria: this.logCategory,
                    detalle: {
                      error: tokenError.message,
                    },
                  });
                  this.handleError('No pudimos procesar tu tarjeta. Por favor, verifica que los datos sean correctos e intenta nuevamente', null, 400);
                }
              } else {
                // Si es un objeto pero no tiene la estructura esperada, rechazar
                Logger.error('paymentMethodId tiene formato JSON pero estructura inválida', new Error('Formato inválido'), {
                  categoria: this.logCategory,
                  detalle: {
                    parsedDataType: typeof parsedData,
                    hasType: !!parsedData?.type,
                    hasCardData: !!parsedData?.cardData,
                  },
                });
                this.handleError('Formato de datos de tarjeta inválido. Por favor, intenta nuevamente.', null, 400);
              }
            } catch (e) {
              // Si no es JSON válido, asumir que ya es un token string
              if (typeof crearSuscripcionDto.paymentMethodId === 'string') {
                tokenId = crearSuscripcionDto.paymentMethodId;
                
                // Validar que no sea el JSON original
                if (tokenId.trim().startsWith('{')) {
                  Logger.error('paymentMethodId parece ser un JSON pero no se pudo parsear', new Error('Formato inválido'), {
                    categoria: this.logCategory,
                    detalle: {
                      paymentMethodId: tokenId.substring(0, 100),
                    },
                  });
                  this.handleError('Formato de datos de tarjeta inválido. Por favor, intenta nuevamente.', null, 400);
                }
              } else {
                Logger.error('paymentMethodId no es un string válido', new Error('Tipo inválido'), {
                  categoria: this.logCategory,
                  detalle: {
                    type: typeof crearSuscripcionDto.paymentMethodId,
                  },
                });
                this.handleError('Error: Formato de datos de pago inválido.', null, 400);
              }
            }
            
            // Validar que tokenId sea un string válido y no vacío, y que no sea un JSON
            if (!tokenId || typeof tokenId !== 'string' || !tokenId.trim() || tokenId.trim().startsWith('{')) {
              Logger.error('Token inválido después del procesamiento', new Error('Token inválido'), {
                categoria: this.logCategory,
                detalle: {
                  originalPaymentMethodId: typeof crearSuscripcionDto.paymentMethodId,
                  tokenId: typeof tokenId,
                  tokenIdLength: tokenId?.length || 0,
                  tokenIdPreview: tokenId?.substring(0, 50) || 'undefined',
                  startsWithBrace: tokenId?.trim().startsWith('{') || false,
                },
              });
              this.handleError('Error: Token de tarjeta inválido. Por favor, intenta nuevamente.', null, 400);
            }
            
            const subscriptionResult = await wompiService.createSubscription(
              tokenId,
              crearSuscripcionDto.tipoPlan,
              isAnnual,
              restaurante[0].correo,
              restaurante[0].nombre,
              crearSuscripcionDto.restauranteId,
              restaurante[0].telefono
            );

            wompiTransactionId = subscriptionResult.transactionId;

            Logger.info('Resultado de transacción Wompi recibido', {
              categoria: this.logCategory,
              detalle: {
                transactionId: subscriptionResult.transactionId,
                status: subscriptionResult.status,
                restauranteId: crearSuscripcionDto.restauranteId,
              },
            });

            // Si la transacción está PENDING, intentar verificarla una vez más
            // En ambiente de pruebas de Wompi, las transacciones pueden quedar PENDING
            // y luego cambiar a APPROVED después de unos segundos
            if (subscriptionResult.status === 'PENDING') {
              Logger.info('Transacción Wompi en PENDING, esperando 3 segundos para verificar...', {
                categoria: this.logCategory,
                detalle: { transactionId: subscriptionResult.transactionId },
              });

              // Esperar 3 segundos
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Verificar el estado de la transacción
              try {
                const verificationResult = await wompiService.verifyTransaction(subscriptionResult.transactionId);

                Logger.info('Verificación de transacción Wompi completada', {
                  categoria: this.logCategory,
                  detalle: {
                    transactionId: subscriptionResult.transactionId,
                    statusOriginal: subscriptionResult.status,
                    statusVerificado: verificationResult.data.status,
                  },
                });

                // Actualizar el status con el resultado de la verificación
                subscriptionResult.status = verificationResult.data.status;
              } catch (verifyError: any) {
                Logger.warn('No se pudo verificar la transacción Wompi, continuando con PENDING', {
                  categoria: this.logCategory,
                  detalle: { error: verifyError.message },
                });
              }
            }

            // Mapear estado de Wompi a nuestro estado
            // APPROVED, DECLINED, VOIDED, ERROR, PENDING
            if (subscriptionResult.status === 'APPROVED') {
              estado = 'active';
            } else if (subscriptionResult.status === 'PENDING') {
              // La transacción sigue PENDING, se activará cuando el webhook notifique
              estado = 'incomplete';

              Logger.warn('Transacción Wompi quedó en PENDING. La suscripción se activará cuando Wompi notifique la aprobación vía webhook.', {
                categoria: this.logCategory,
                detalle: {
                  transactionId: subscriptionResult.transactionId,
                  restauranteId: crearSuscripcionDto.restauranteId,
                },
              });
            } else {
              this.handleError('Tu pago no pudo ser procesado. Por favor, verifica los datos de tu tarjeta e intenta nuevamente', null, 400);
            }

            // Calcular fechas de período
            const fechaActualDate = new Date(fechaActual);
            inicioPeriodo = fechaActualDate.toISOString().replace('T', ' ').slice(0, 23);
            const finPeriodoDate = new Date(fechaActualDate);
            finPeriodoDate.setMonth(finPeriodoDate.getMonth() + (isAnnual ? 12 : 1));
            finPeriodo = finPeriodoDate.toISOString().replace('T', ' ').slice(0, 23);

            // Nota: El pago se registrará después de crear/actualizar la suscripción
            // para tener el suscripcion_id correcto
          } else {
            // Procesar pago con Stripe (código original)
            try {
              // Obtener precio según período (mensual o anual)
              const planPrice = getPlanPrice(crearSuscripcionDto.tipoPlan, 'USD', isAnnual);
              
              if (!planPrice.priceId) {
                const priceIdVar = isAnnual 
                  ? `STRIPE_PRICE_ID_${crearSuscripcionDto.tipoPlan.toUpperCase()}_ANNUAL`
                  : `STRIPE_PRICE_ID_${crearSuscripcionDto.tipoPlan.toUpperCase()}`;
                
                this.handleError(
                  `El plan ${crearSuscripcionDto.tipoPlan} (${isAnnual ? 'anual' : 'mensual'}) no tiene un precio configurado en Stripe. ` +
                  `Por favor, configura ${priceIdVar} en las variables de entorno.`,
                  null,
                  500
                );
              }

              // Crear o obtener cliente en Stripe
              let customer: Stripe.Customer;
              const customerExistente = await stripe.customers.list({
                email: restaurante[0].correo,
                limit: 1,
              });

              if (customerExistente.data.length > 0) {
                customer = customerExistente.data[0];
              } else {
                customer = await stripe.customers.create({
                  email: restaurante[0].correo,
                  name: restaurante[0].nombre,
                  metadata: {
                    restauranteId: crearSuscripcionDto.restauranteId,
                  },
                });
              }

              stripeCustomerId = customer.id;

              // Adjuntar método de pago al cliente
              await stripe.paymentMethods.attach(crearSuscripcionDto.paymentMethodId, {
                customer: customer.id,
              });

              // Establecer como método de pago por defecto
              await stripe.customers.update(customer.id, {
                invoice_settings: {
                  default_payment_method: crearSuscripcionDto.paymentMethodId,
                },
              });

              // Crear suscripción en Stripe con el price_id (mensual o anual)
              // Stripe intentará cobrar automáticamente con el método de pago por defecto
              const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: planPrice.priceId }],
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice', 'latest_invoice.payment_intent'],
              });

              stripeSubscriptionId = subscription.id;
              estado = subscription.status === 'trialing' ? 'trialing' : 'active';
              
              // Verificar que current_period_start y current_period_end existan
              // Si la suscripción está incomplete, estos valores pueden no estar disponibles
              const sub = subscription as any;
              if (sub.current_period_start && sub.current_period_end) {
                const inicioPeriodoDate = new Date(sub.current_period_start * 1000);
                const finPeriodoDate = new Date(sub.current_period_end * 1000);
                
                // Validar que las fechas sean válidas
                if (!isNaN(inicioPeriodoDate.getTime()) && !isNaN(finPeriodoDate.getTime())) {
                  // Convertir a formato SQL Server (YYYY-MM-DD HH:mm:ss.sss)
                  inicioPeriodo = inicioPeriodoDate.toISOString().replace('T', ' ').slice(0, 23);
                  finPeriodo = finPeriodoDate.toISOString().replace('T', ' ').slice(0, 23);
                } else {
                  // Si las fechas son inválidas, usar fecha actual y calcular fin de período
                  const fechaActualDate = new Date();
                  inicioPeriodo = fechaActualDate.toISOString().replace('T', ' ').slice(0, 23);
                  const finPeriodoDate2 = new Date(fechaActualDate);
                  finPeriodoDate2.setMonth(finPeriodoDate2.getMonth() + (isAnnual ? 12 : 1));
                  finPeriodo = finPeriodoDate2.toISOString().replace('T', ' ').slice(0, 23);
                }
              } else {
                // Si no hay períodos definidos (suscripción incomplete), usar fecha actual
                const fechaActualDate = new Date();
                inicioPeriodo = fechaActualDate.toISOString().replace('T', ' ').slice(0, 23);
                const finPeriodoDate2 = new Date(fechaActualDate);
                finPeriodoDate2.setMonth(finPeriodoDate2.getMonth() + (isAnnual ? 12 : 1));
                finPeriodo = finPeriodoDate2.toISOString().replace('T', ' ').slice(0, 23);
              }
            } catch (error: any) {
              Logger.error('Error al crear suscripción en Stripe', error instanceof Error ? error : new Error(String(error)), {
                categoria: this.logCategory,
                restauranteId: crearSuscripcionDto.restauranteId,
              });
              this.handleError('Ocurrió un error al procesar tu pago. Por favor, intenta nuevamente o contacta a soporte', error, 500);
            }
          }
        } catch (error: any) {
          // Error general al procesar el pago (ya sea Wompi o Stripe)
          Logger.error('Error al procesar el pago', error instanceof Error ? error : new Error(String(error)), {
            categoria: this.logCategory,
            restauranteId: crearSuscripcionDto.restauranteId,
          });
          this.handleError(`Error al procesar el pago: ${error.message}`, error, 500);
        }
      }
    }

    // Si es payment link de Wompi (sin paymentMethodId), crear directamente en BD sin más procesamiento
    // Esto evita timeouts ya que no hacemos llamadas externas
    if (paymentProvider === 'wompi' && !crearSuscripcionDto.paymentMethodId && estado === 'incomplete') {
      // Ya calculamos inicioPeriodo y finPeriodo arriba, solo crear en BD
      // Continuar con la creación en BD más abajo
    }

    // Si ya existe una suscripción, actualizarla en lugar de crear una nueva
    let suscripcionCreada: Suscripcion;

    if (suscripcionExistente) {
      // Actualizar suscripción existente (upgrade de FREE a PRO/PREMIUM, o PRO a PREMIUM)
      Logger.info('Actualizando suscripción existente (upgrade)', {
        categoria: this.logCategory,
        detalle: {
          suscripcionId: suscripcionExistente.id,
          planAnterior: suscripcionExistente.tipoPlan,
          planNuevo: crearSuscripcionDto.tipoPlan,
          restauranteId: crearSuscripcionDto.restauranteId,
        },
      });

      const resultado = await AppDataSource.query(
        `UPDATE suscripciones
         SET tipo_plan = @0,
             estado = @1,
             stripe_subscription_id = @2,
             stripe_customer_id = @3,
             inicio_periodo_actual = @4,
             fin_periodo_actual = @5,
             fecha_actualizacion = @6
         OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.tipo_plan, INSERTED.estado,
           INSERTED.stripe_subscription_id, INSERTED.stripe_customer_id,
           INSERTED.inicio_periodo_actual, INSERTED.fin_periodo_actual,
           INSERTED.cancelar_al_fin_periodo, INSERTED.fecha_cancelacion,
           INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
         WHERE id = @7`,
        [
          crearSuscripcionDto.tipoPlan,
          estado,
          paymentProvider === 'wompi' ? wompiTransactionId : stripeSubscriptionId,
          paymentProvider === 'stripe' ? stripeCustomerId : null,
          inicioPeriodo,
          finPeriodo,
          fechaActual,
          suscripcionExistente.id,
        ]
      );

      if (!resultado || resultado.length === 0) {
        this.handleError('Error al actualizar la suscripción', null, 500);
      }

      suscripcionCreada = this.mapToSuscripcion(resultado[0]);
    } else {
      // Crear nueva suscripción (no existe ninguna previa)
      // Nota: Para Wompi, almacenamos el transaction_id en stripe_subscription_id
      // y el payment_provider se puede identificar por el formato del ID o agregar un campo separado
      const resultado = await AppDataSource.query(
        `INSERT INTO suscripciones (
          restaurante_id, tipo_plan, estado, stripe_subscription_id, stripe_customer_id,
          inicio_periodo_actual, fin_periodo_actual, fecha_creacion, fecha_actualizacion
        )
        OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.tipo_plan, INSERTED.estado,
          INSERTED.stripe_subscription_id, INSERTED.stripe_customer_id,
          INSERTED.inicio_periodo_actual, INSERTED.fin_periodo_actual,
          INSERTED.cancelar_al_fin_periodo, INSERTED.fecha_cancelacion,
          INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
        VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @7)`,
        [
          crearSuscripcionDto.restauranteId,
          crearSuscripcionDto.tipoPlan,
          estado,
          paymentProvider === 'wompi' ? wompiTransactionId : stripeSubscriptionId,
          paymentProvider === 'stripe' ? stripeCustomerId : null,
          inicioPeriodo,
          finPeriodo,
          fechaActual,
        ]
      );

      if (!resultado || resultado.length === 0) {
        this.handleError('Error al crear la suscripción', null, 500);
      }

      suscripcionCreada = this.mapToSuscripcion(resultado[0]);
    }

    // Registrar el pago si la suscripción es de pago (no free) y el proveedor es Stripe
    // Para Wompi, el pago ya se registró arriba
    if (crearSuscripcionDto.tipoPlan !== 'free' && paymentProvider === 'stripe' && stripeSubscriptionId) {
      try {
        // Obtener la suscripción de Stripe para verificar el invoice
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
          expand: ['latest_invoice'],
        });

        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        if (latestInvoice && latestInvoice.status === 'paid' && latestInvoice.amount_paid) {
          const fechaPago = latestInvoice.status_transitions?.paid_at 
            ? new Date(latestInvoice.status_transitions.paid_at * 1000).toISOString().replace('T', ' ').slice(0, 23)
            : fechaActual;
          const amount = latestInvoice.amount_paid / 100; // Convertir de centavos a dólares
          const currency = latestInvoice.currency.toUpperCase();

          // Verificar si el pago ya existe (para evitar duplicados)
          const pagoExistente = await AppDataSource.query(
            `SELECT id FROM pagos WHERE stripe_invoice_id = @0`,
            [latestInvoice.id]
          );

          if (!pagoExistente || pagoExistente.length === 0) {
            // Crear registro de pago
            await AppDataSource.query(
              `INSERT INTO pagos (
                suscripcion_id, restaurante_id, monto, moneda,
                stripe_invoice_id, estado, fecha_pago, fecha_creacion
              )
              VALUES (@0, @1, @2, @3, @4, 'exitoso', @5, @6)`,
              [
                suscripcionCreada.id,
                crearSuscripcionDto.restauranteId,
                amount,
                currency,
                latestInvoice.id,
                fechaPago,
                fechaActual,
              ]
            );

            Logger.info('Pago registrado exitosamente al crear suscripción', {
              categoria: this.logCategory,
              detalle: { suscripcionId: suscripcionCreada.id, monto: amount },
            });
          }
        }
      } catch (paymentError: any) {
        // No fallar la creación de suscripción si falla el registro del pago
        // El webhook lo registrará más tarde
        Logger.warn('Error al registrar pago inicial (se registrará vía webhook)', {
          categoria: this.logCategory,
          detalle: { error: paymentError instanceof Error ? paymentError.message : String(paymentError) },
        });
      }
    }

    // Registrar el pago de Wompi si fue exitoso
    if (paymentProvider === 'wompi' && wompiTransactionId && suscripcionCreada && estado === 'active') {
      try {
        const isAnnual = crearSuscripcionDto.isAnnual || false;
        const planPrice = getWompiPlanPrice(crearSuscripcionDto.tipoPlan as 'pro' | 'premium', isAnnual);

        // Verificar si el pago ya existe (para evitar duplicados)
        const pagoExistente = await AppDataSource.query(
          `SELECT id FROM pagos WHERE stripe_payment_intent_id = @0`,
          [wompiTransactionId]
        );

        if (!pagoExistente || pagoExistente.length === 0) {
          // Crear registro de pago para Wompi
          await AppDataSource.query(
            `INSERT INTO pagos (
              suscripcion_id, restaurante_id, monto, moneda,
              stripe_payment_intent_id, estado, fecha_pago, fecha_creacion
            )
            VALUES (@0, @1, @2, @3, @4, 'exitoso', @5, @6)`,
            [
              suscripcionCreada.id,
              crearSuscripcionDto.restauranteId,
              planPrice, // Precio en pesos colombianos (ya está en pesos, no en centavos)
              'COP',
              wompiTransactionId,
              fechaActual,
              fechaActual,
            ]
          );

          Logger.info('Pago de Wompi registrado exitosamente', {
            categoria: this.logCategory,
            detalle: {
              suscripcionId: suscripcionCreada.id,
              monto: planPrice,
              transactionId: wompiTransactionId,
            },
          });
        }
      } catch (error: any) {
        Logger.warn('Error al registrar pago de Wompi (se registrará vía webhook)', {
          categoria: this.logCategory,
          detalle: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }

    // Nota: Ya no necesitamos cancelar la suscripción anterior porque ahora
    // actualizamos la suscripción existente en lugar de crear una nueva

    // Actualizar estado de suscripción en restaurante
    await AppDataSource.query(
      `UPDATE restaurantes SET estado_suscripcion = @0, fecha_actualizacion = @1 WHERE id = @2`,
      [estado, fechaActual, crearSuscripcionDto.restauranteId]
    );

    const suscripcion = suscripcionCreada;

    Logger.info('Suscripción creada exitosamente', {
      categoria: this.logCategory,
      restauranteId: crearSuscripcionDto.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'suscripcion',
      entidadId: suscripcion.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: suscripcion.id,
        tipoPlan: suscripcion.tipoPlan,
        estado: suscripcion.estado,
      },
    });

    return suscripcion;
  }

  /**
   * Actualiza una suscripción (cambio de plan o cancelación)
   */
  async actualizar(
    suscripcionId: string,
    actualizarSuscripcionDto: ActualizarSuscripcionDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Suscripcion> {
    this.logOperation(`actualizar suscripción: ${suscripcionId}`, { data: actualizarSuscripcionDto, usuarioId });

    const suscripcion = await AppDataSource.query(
      `SELECT * FROM suscripciones WHERE id = @0`,
      [suscripcionId]
    );

    if (!suscripcion || suscripcion.length === 0) {
      this.handleError('Suscripción no encontrada', null, 404);
    }

    const suscripcionActual = this.mapToSuscripcion(suscripcion[0]);
    const fechaActual = getMonteriaLocalDate();
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    // Si se está cancelando
    if (actualizarSuscripcionDto.cancelarAlFinPeriodo !== undefined) {
      campos.push(`cancelar_al_fin_periodo = @${indice}`);
      valores.push(actualizarSuscripcionDto.cancelarAlFinPeriodo ? 1 : 0);
      indice++;

      if (actualizarSuscripcionDto.cancelarAlFinPeriodo) {
        campos.push(`fecha_cancelacion = @${indice}`);
        valores.push(fechaActual);
        indice++;

        // Cancelar en Stripe si existe
        if (suscripcionActual.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.update(suscripcionActual.stripeSubscriptionId, {
              cancel_at_period_end: true,
            });
          } catch (error: any) {
            Logger.error('Error al cancelar suscripción en Stripe', error instanceof Error ? error : new Error(String(error)), {
              categoria: this.logCategory,
              detalle: { suscripcionId },
            });
          }
        }
      }
    }

    // Si se está cambiando el plan
    if (actualizarSuscripcionDto.tipoPlan && actualizarSuscripcionDto.tipoPlan !== suscripcionActual.tipoPlan) {
      campos.push(`tipo_plan = @${indice}`);
      valores.push(actualizarSuscripcionDto.tipoPlan);
      indice++;

      // Actualizar en Stripe si existe
      if (suscripcionActual.stripeSubscriptionId && actualizarSuscripcionDto.tipoPlan !== 'free') {
        try {
          // Mantener el período actual (mensual o anual) al cambiar de plan
          // Determinar si es anual basándose en el período actual (asumir mensual por defecto)
          // TODO: Mejorar esta lógica para determinar correctamente si es anual
          const isAnnual = false; // Por defecto asumir mensual
          const planPrice = getPlanPrice(actualizarSuscripcionDto.tipoPlan, 'USD', isAnnual);
          
          if (planPrice.priceId) {
            // Obtener el subscription item actual
            const subscription = await stripe.subscriptions.retrieve(suscripcionActual.stripeSubscriptionId);
            const subscriptionItemId = subscription.items.data[0]?.id;

            if (subscriptionItemId) {
              await stripe.subscriptions.update(suscripcionActual.stripeSubscriptionId, {
                items: [{
                  id: subscriptionItemId,
                  price: planPrice.priceId,
                }],
              });
            }
          }
        } catch (error: any) {
          Logger.error('Error al actualizar plan en Stripe', error instanceof Error ? error : new Error(String(error)), {
            categoria: this.logCategory,
            detalle: { suscripcionId },
          });
        }
      }
    }

    if (campos.length === 0) {
      this.handleError('No hay campos para actualizar', null, 400);
    }

    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    valores.push(suscripcionId);

    await AppDataSource.query(
      `UPDATE suscripciones SET ${campos.join(', ')} WHERE id = @${indice + 1}`,
      valores
    );

    const suscripcionActualizada = await AppDataSource.query(
      `SELECT * FROM suscripciones WHERE id = @0`,
      [suscripcionId]
    );

    return this.mapToSuscripcion(suscripcionActualizada[0]);
  }

  /**
   * Verifica los límites de un plan
   */
  async verificarLimites(restauranteId: string, tipo: 'items' | 'mesas' | 'usuarios'): Promise<{ permitido: boolean; limite: number; actual: number }> {
    const suscripcion = await this.obtenerPorRestauranteId(restauranteId);
    
    if (!suscripcion) {
      return { permitido: false, limite: 0, actual: 0 };
    }

    const plan = SUBSCRIPTION_PLANS[suscripcion.tipoPlan];
    const limite = plan.limits[`max${tipo.charAt(0).toUpperCase() + tipo.slice(1)}` as keyof typeof plan.limits] as number;

    // Si el límite es -1, es ilimitado
    if (limite === -1) {
      return { permitido: true, limite: -1, actual: 0 };
    }

    // Contar elementos actuales
    let actual = 0;
    if (tipo === 'items') {
      const resultado = await AppDataSource.query(
        `SELECT COUNT(*) as total FROM items_menu WHERE restaurante_id = @0 AND fecha_eliminacion IS NULL`,
        [restauranteId]
      );
      actual = resultado[0]?.total || 0;
    } else if (tipo === 'mesas') {
      const resultado = await AppDataSource.query(
        `SELECT COUNT(*) as total FROM mesas WHERE restaurante_id = @0`,
        [restauranteId]
      );
      actual = resultado[0]?.total || 0;
    } else if (tipo === 'usuarios') {
      const resultado = await AppDataSource.query(
        `SELECT COUNT(*) as total FROM usuarios WHERE restaurante_id = @0 AND activo = 1 AND fecha_eliminacion IS NULL`,
        [restauranteId]
      );
      actual = resultado[0]?.total || 0;
    }

    return {
      permitido: actual < limite,
      limite,
      actual,
    };
  }
}

