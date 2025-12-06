import { BaseController } from './base.controller';
import { CategoriasService } from '../services/categorias.service';
import { CrearCategoriaDto, ActualizarCategoriaDto, QueryCategoriaDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class CategoriasController extends BaseController {
  private categoriasService = new CategoriasService();

  /**
   * Obtiene todas las categorías con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryCategoriaDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      nombre: req.query.nombre as string | undefined,
      activa: req.query.activa !== undefined ? req.query.activa === 'true' : undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
    };

    const resultado = await this.categoriasService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Categorías obtenidas exitosamente');
  });

  /**
   * Obtiene una categoría por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const categoria = await this.categoriasService.obtenerPorId(id);

    if (!categoria) {
      return this.responseUtil.error(res, 'Categoría no encontrada', 404, 'CATEGORIA_NOT_FOUND');
    }

    return this.responseUtil.success(res, categoria, 'Categoría obtenida exitosamente', 200);
  });

  /**
   * Obtiene todas las categorías de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const categorias = await this.categoriasService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, categorias, 'Categorías obtenidas exitosamente', 200);
  });

  /**
   * Obtiene todas las categorías activas de un restaurante específico (público, no requiere autenticación)
   */
  public obtenerPorRestauranteIdPublico = this.asyncHandler(async (req, res) => {
    const { restauranteId } = req.params;
    const categorias = await this.categoriasService.obtenerPorRestauranteId(restauranteId, true); // Solo activas

    return this.responseUtil.success(res, categorias, 'Categorías obtenidas exitosamente', 200);
  });

  /**
   * Crea una nueva categoría
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearCategoriaDto = this.getBody<CrearCategoriaDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const categoria = await this.categoriasService.crear(crearCategoriaDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, categoria, 'Categoría creada exitosamente', 201);
  });

  /**
   * Actualiza una categoría
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarCategoriaDto = this.getBody<ActualizarCategoriaDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const categoria = await this.categoriasService.actualizar(id, actualizarCategoriaDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, categoria, 'Categoría actualizada exitosamente', 200);
  });

  /**
   * Elimina una categoría
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.categoriasService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Categoría eliminada exitosamente', 200);
  });
}

