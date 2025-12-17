import { BaseController } from './base.controller';
import { ConfiguracionReservasService } from '../services/configuracion-reservas.service';
import { CrearConfiguracionReservasDto, ActualizarConfiguracionReservasDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class ConfiguracionReservasController extends BaseController {
  private configuracionReservasService = new ConfiguracionReservasService();

  /**
   * Obtiene la configuración de reservas de un restaurante
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const configuracion = await this.configuracionReservasService.obtenerPorRestauranteId(restauranteId);

    if (!configuracion) {
      return this.responseUtil.error(res, 'Configuración de reservas no encontrada', 404, 'CONFIGURACION_NOT_FOUND');
    }

    return this.responseUtil.success(res, configuracion, 'Configuración obtenida exitosamente', 200);
  });

  /**
   * Crea o actualiza la configuración de reservas
   * Si ya existe, la actualiza; si no, la crea
   */
  public crearOActualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const restauranteId = this.getRestaurantId(req);
    const crearConfiguracionDto = this.getBody<CrearConfiguracionReservasDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    // Asegurar que el restauranteId del DTO coincida con el del token
    crearConfiguracionDto.restauranteId = restauranteId;

    const configuracion = await this.configuracionReservasService.crearOActualizar(
      restauranteId,
      crearConfiguracionDto,
      usuarioId,
      requestInfo
    );
    
    return this.responseUtil.success(res, configuracion, 'Configuración guardada exitosamente', 200);
  });

  /**
   * Actualiza la configuración de reservas
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const restauranteId = this.getRestaurantId(req);
    const actualizarConfiguracionDto = this.getBody<ActualizarConfiguracionReservasDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const configuracion = await this.configuracionReservasService.actualizar(
      restauranteId,
      actualizarConfiguracionDto,
      usuarioId,
      requestInfo
    );
    
    return this.responseUtil.success(res, configuracion, 'Configuración actualizada exitosamente', 200);
  });
}

