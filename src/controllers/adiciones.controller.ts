import { AdicionesService } from '../services/adiciones.service';
import { BaseController } from './base.controller';
import { CrearAdicionDto, ActualizarAdicionDto, QueryAdicionDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class AdicionesController extends BaseController {
  private adicionesService = new AdicionesService();

  /**
   * Obtiene todas las adiciones con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryAdicionDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      nombre: req.query.nombre as string | undefined,
      activa: req.query.activa !== undefined ? req.query.activa === 'true' : undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
    };

    const resultado = await this.adicionesService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Adiciones obtenidas exitosamente');
  });

  /**
   * Obtiene una adición por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const adicion = await this.adicionesService.obtenerPorId(id);

    if (!adicion) {
      return this.responseUtil.error(res, 'Adición no encontrada', 404, 'ADICION_NOT_FOUND');
    }

    return this.responseUtil.success(res, adicion, 'Adición obtenida exitosamente', 200);
  });

  /**
   * Obtiene todas las adiciones de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const adiciones = await this.adicionesService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, adiciones, 'Adiciones obtenidas exitosamente', 200);
  });

  /**
   * Crea una nueva adición
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearAdicionDto = this.getBody<CrearAdicionDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const adicion = await this.adicionesService.crear(crearAdicionDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, adicion, 'Adición creada exitosamente', 201);
  });

  /**
   * Actualiza una adición
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarAdicionDto = this.getBody<ActualizarAdicionDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const adicion = await this.adicionesService.actualizar(id, actualizarAdicionDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, adicion, 'Adición actualizada exitosamente', 200);
  });

  /**
   * Elimina una adición
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.adicionesService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Adición eliminada exitosamente', 200);
  });
}

