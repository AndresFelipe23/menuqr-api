import { BaseController } from './base.controller';
import { SuscripcionesService } from '../services/suscripciones.service';
import { CrearSuscripcionDto, ActualizarSuscripcionDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';
import { getWompiPaymentLink } from '../config/wompi.config';

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
   */
  public obtenerWompiPaymentLink = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { plan } = req.query;
    const isAnnual = req.query.annual === 'true';

    if (!plan || !['pro', 'premium'].includes(plan as string)) {
      return this.responseUtil.error(res, 'Plan inválido. Debe ser: pro o premium', 400, 'INVALID_PLAN');
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

    // Agregar parámetros a la URL para identificar la transacción
    const user = req.user;
    const url = new URL(paymentLink);
    
    // Agregar parámetros de referencia (si Wompi los soporta)
    // Estos parámetros se pueden usar para identificar la transacción en el webhook
    if (user?.restauranteId) {
      url.searchParams.append('reference', `SUB_${user.restauranteId}_${Date.now()}`);
      url.searchParams.append('restauranteId', user.restauranteId);
    }

    return this.responseUtil.success(
      res,
      { paymentLink: url.toString() },
      'Link de pago obtenido exitosamente',
      200
    );
  });
}

