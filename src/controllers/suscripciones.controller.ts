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
      
      if (suscripcionExistente && suscripcionExistente.estado === 'active') {
        return this.responseUtil.error(
          res,
          'Ya tienes una suscripción activa. Actualiza tu plan desde la página de planes.',
          409,
          'SUBSCRIPTION_ALREADY_ACTIVE'
        );
      }

      // Crear suscripción pendiente/incomplete que se actualizará cuando llegue el webhook
      const crearSuscripcionDto: any = {
        restauranteId: user.restauranteId,
        tipoPlan: plan,
        isAnnual,
        paymentProvider: 'wompi',
        // No incluimos paymentMethodId porque aún no tenemos la transacción
      };

      const suscripcion = await this.suscripcionesService.crear(
        crearSuscripcionDto,
        user.id,
        this.getRequestInfo(req)
      );

      // Construir la URL del payment link con parámetros
      const url = new URL(paymentLink);
      
      // Agregar referencia única para identificar la transacción en el webhook
      // Wompi puede incluir esta referencia en el webhook
      url.searchParams.append('reference', reference);
      
      // URL de callback después del pago (redirección después de completar el pago)
      // Wompi permite configurar redirect_url en los payment links
      const frontendAdminUrl = process.env.FRONTEND_ADMIN_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://admin.menusqr.site' 
          : 'http://localhost:3000');
      
      // URL de callback después del pago exitoso
      const callbackUrl = `${frontendAdminUrl}/dashboard/planes?wompi_callback=true&reference=${encodeURIComponent(reference)}&plan=${plan}&annual=${isAnnual}`;
      
      // Agregar redirectUrl como parámetro (Wompi puede soportar esto según configuración)
      // Nota: Algunos payment links de Wompi tienen el redirectUrl pre-configurado
      // Si el link ya tiene redirectUrl, estos parámetros lo sobrescribirán o se agregarán
      url.searchParams.append('redirect_url', callbackUrl);

      Logger.info('Link de pago Wompi generado', {
        categoria: LogCategory.NEGOCIO,
        detalle: { 
          restauranteId: user.restauranteId, 
          plan, 
          isAnnual, 
          reference,
          suscripcionId: suscripcion.id 
        },
      });

      return this.responseUtil.success(
        res,
        { 
          paymentLink: url.toString(),
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

