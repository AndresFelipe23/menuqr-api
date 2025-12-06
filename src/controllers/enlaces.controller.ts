import { BaseController } from './base.controller';
import { EnlacesService } from '../services/enlaces.service';
import { CrearEnlaceDto, ActualizarEnlaceDto, QueryEnlaceDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class EnlacesController extends BaseController {
  private enlacesService = new EnlacesService();

  /**
   * Obtiene todos los enlaces con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryEnlaceDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      titulo: req.query.titulo as string | undefined,
      tipoIcono: req.query.tipoIcono as string | undefined,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
    };

    const resultado = await this.enlacesService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Enlaces obtenidos exitosamente');
  });

  /**
   * Obtiene un enlace por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const enlace = await this.enlacesService.obtenerPorId(id);

    if (!enlace) {
      return this.responseUtil.error(res, 'Enlace no encontrado', 404, 'ENLACE_NOT_FOUND');
    }

    return this.responseUtil.success(res, enlace, 'Enlace obtenido exitosamente', 200);
  });

  /**
   * Obtiene todos los enlaces de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const enlaces = await this.enlacesService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, enlaces, 'Enlaces obtenidos exitosamente', 200);
  });

  /**
   * Obtiene todos los enlaces activos de un restaurante específico (público, no requiere autenticación)
   */
  public obtenerPorRestauranteIdPublico = this.asyncHandler(async (req, res) => {
    const { restauranteId } = req.params;
    const enlaces = await this.enlacesService.obtenerPorRestauranteId(restauranteId, true); // Solo activos

    return this.responseUtil.success(res, enlaces, 'Enlaces obtenidos exitosamente', 200);
  });

  /**
   * Crea un nuevo enlace
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearEnlaceDto = this.getBody<CrearEnlaceDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const enlace = await this.enlacesService.crear(crearEnlaceDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, enlace, 'Enlace creado exitosamente', 201);
  });

  /**
   * Actualiza un enlace
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarEnlaceDto = this.getBody<ActualizarEnlaceDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const enlace = await this.enlacesService.actualizar(id, actualizarEnlaceDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, enlace, 'Enlace actualizado exitosamente', 200);
  });

  /**
   * Incrementa el contador de clics de un enlace
   */
  public incrementarClics = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const requestInfo = this.getRequestInfo(req);

    await this.enlacesService.incrementarClics(id, requestInfo);
    return this.responseUtil.success(res, null, 'Contador de clics incrementado exitosamente', 200);
  });

  /**
   * Elimina un enlace
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.enlacesService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Enlace eliminado exitosamente', 200);
  });
}

