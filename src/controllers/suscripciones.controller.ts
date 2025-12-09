import { BaseController } from './base.controller';
import { SuscripcionesService } from '../services/suscripciones.service';
import { CrearSuscripcionDto, ActualizarSuscripcionDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';
import { getWompiPaymentLink } from '../config/wompi.config';
import { Logger, LogCategory } from '../utils/logger';

export class SuscripcionesController extends BaseController {
  private suscripcionesService = new SuscripcionesService();

  /**
   * Obtiene la suscripción de un restaurante
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const suscripcion = await this.suscripcionesService.obtenerPorRestauranteId(restauranteId);

    if (!suscripcion) {
      return this.responseUtil.error(res, 'Suscripción no encontrada', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    return this.responseUtil.success(res, suscripcion, 'Suscripción obtenida exitosamente', 200);
  });

  /**
   * Crea una nueva suscripción
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearSuscripcionDto = this.getBody<CrearSuscripcionDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const suscripcion = await this.suscripcionesService.crear(crearSuscripcionDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, suscripcion, 'Suscripción creada exitosamente', 201);
  });

  /**
   * Actualiza una suscripción
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarSuscripcionDto = this.getBody<ActualizarSuscripcionDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const suscripcion = await this.suscripcionesService.actualizar(id, actualizarSuscripcionDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, suscripcion, 'Suscripción actualizada exitosamente', 200);
  });

  /**
   * Verifica los límites de un plan
   */
  public verificarLimites = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const { tipo } = req.query;

    if (!tipo || !['items', 'mesas', 'usuarios'].includes(tipo as string)) {
      return this.responseUtil.error(res, 'Tipo inválido. Debe ser: items, mesas o usuarios', 400, 'INVALID_TYPE');
    }

    const limites = await this.suscripcionesService.verificarLimites(
      restauranteId,
      tipo as 'items' | 'mesas' | 'usuarios'
    );

    return this.responseUtil.success(res, limites, 'Límites verificados exitosamente', 200);
  });

  /**
   * Obtiene el link de pago de Wompi para un plan
   * Crea una suscripción pendiente antes de redirigir al payment link
   */
  public obtenerWompiPaymentLink = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { plan } = req.query;
    const isAnnual = req.query.annual === 'true';
    const user = req.user;

    if (!plan || !['pro', 'premium'].includes(plan as string)) {
      return this.responseUtil.error(res, 'Plan inválido. Debe ser: pro o premium', 400, 'INVALID_PLAN');
    }

    if (!user?.restauranteId) {
      return this.responseUtil.error(res, 'No se encontró el restaurante del usuario', 400, 'RESTAURANT_NOT_FOUND');
    }

    const paymentLink = getWompiPaymentLink(plan as 'pro' | 'premium', isAnnual);

    if (!paymentLink) {
      return this.responseUtil.error(
        res,
        `No se encontró un link de pago configurado para el plan ${plan} (${isAnnual ? 'anual' : 'mensual'})`,
        404,
        'PAYMENT_LINK_NOT_FOUND'
      );
    }

    // Crear una suscripción pendiente para que el webhook pueda encontrarla después
    // Generar una referencia única para esta transacción
    const reference = `SUB_${user.restauranteId}_${Date.now()}`;
    
    try {
      // Verificar si ya existe una suscripción activa
      const suscripcionExistente = await this.suscripcionesService.obtenerPorRestauranteId(user.restauranteId);
      
      // Permitir upgrade si tiene FREE y quiere PRO/PREMIUM, o PRO y quiere PREMIUM
      if (suscripcionExistente && suscripcionExistente.estado === 'active') {
        const esUpgrade = (suscripcionExistente.tipoPlan === 'free' && (plan === 'pro' || plan === 'premium')) ||
                          (suscripcionExistente.tipoPlan === 'pro' && plan === 'premium');
        
        // Si es el mismo plan, rechazar
        if (suscripcionExistente.tipoPlan === plan) {
          return this.responseUtil.error(
            res,
            'Ya tienes una suscripción activa con este plan.',
            409,
            'SUBSCRIPTION_ALREADY_ACTIVE'
          );
        }
        
        // Si no es un upgrade válido, rechazar
        if (!esUpgrade) {
          return this.responseUtil.error(
            res,
            'No puedes cambiar a un plan inferior. Cancela tu suscripción actual primero.',
            409,
            'INVALID_DOWNGRADE'
          );
        }
        
        // Si es un upgrade válido, continuar con la creación (se cancelará la anterior después del pago)
      }

      // Crear suscripción pendiente/incomplete que se actualizará cuando llegue el webhook
      const crearSuscripcionDto: any = {
        restauranteId: user.restauranteId,
        tipoPlan: plan,
        isAnnual,
        paymentProvider: 'wompi',
        // No incluimos paymentMethodId porque aún no tenemos la transacción
      };

      // Crear suscripción de forma asíncrona para que no bloquee la respuesta
      // El webhook se encargará de actualizarla cuando se complete el pago
      let suscripcion;
      try {
        suscripcion = await this.suscripcionesService.crear(
          crearSuscripcionDto,
          user.id,
          this.getRequestInfo(req)
        );
        
        Logger.info('Suscripción creada exitosamente para payment link', {
          categoria: LogCategory.NEGOCIO,
          detalle: { 
            restauranteId: user.restauranteId, 
            plan, 
            isAnnual, 
            suscripcionId: suscripcion.id,
            estado: suscripcion.estado 
          },
        });
      } catch (error: any) {
        Logger.error('Error al crear suscripción para payment link', error instanceof Error ? error : new Error(String(error)), {
          categoria: LogCategory.NEGOCIO,
          detalle: { restauranteId: user.restauranteId, plan, isAnnual },
        });
        return this.responseUtil.error(
          res,
          'Error al preparar la suscripción. Por favor, intenta nuevamente.',
          500,
          'SUBSCRIPTION_CREATION_ERROR'
        );
      }

      // IMPORTANTE: Los payment links de Wompi NO deben modificarse con parámetros adicionales
      // Agregar parámetros como redirect_url o reference puede causar que el link no funcione
      // El redirect_url debe configurarse directamente en el panel de Wompi para cada payment link
      // La referencia se puede identificar usando el restauranteId y suscripcionId en el webhook
      
      // URL de callback esperada (solo para referencia en logs)
      const frontendAdminUrl = process.env.FRONTEND_ADMIN_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://qrestaurante.site' 
          : 'http://localhost:3000');
      
      const expectedCallbackUrl = `${frontendAdminUrl}/dashboard/planes?wompi_callback=true&reference=${encodeURIComponent(reference)}&plan=${plan}&annual=${isAnnual}`;
      
      Logger.info('Nota importante: El redirect_url debe configurarse en el panel de Wompi', {
        categoria: LogCategory.NEGOCIO,
        detalle: {
          expectedCallbackUrl: expectedCallbackUrl,
          reference: reference,
          suscripcionId: suscripcion.id,
        },
      });

      Logger.info('Link de pago Wompi generado', {
        categoria: LogCategory.NEGOCIO,
        detalle: { 
          restauranteId: user.restauranteId, 
          plan, 
          isAnnual, 
          reference,
          suscripcionId: suscripcion.id,
          paymentLink: paymentLink.substring(0, 80) + '...', // Solo primeros caracteres por seguridad
          note: 'El payment link se devuelve sin modificar. El redirect_url debe configurarse en el panel de Wompi.',
        },
      });

      return this.responseUtil.success(
        res,
        { 
          paymentLink: paymentLink, // Usar el link original sin modificar
          reference,
          suscripcionId: suscripcion.id 
        },
        'Link de pago obtenido exitosamente',
        200
      );
    } catch (error: any) {
      Logger.error('Error al crear suscripción para payment link de Wompi', error, {
        categoria: LogCategory.NEGOCIO,
      });
      throw error;
    }
  });
}

