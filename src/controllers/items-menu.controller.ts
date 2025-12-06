import { ItemsMenuService } from '../services/items-menu.service';
import { BaseController } from './base.controller';
import { CrearItemMenuDto, ActualizarItemMenuDto, QueryItemMenuDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class ItemsMenuController extends BaseController {
  private itemsMenuService = new ItemsMenuService();

  /**
   * Obtiene todos los items del menú con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryItemMenuDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      categoriaId: req.query.categoriaId as string | undefined,
      nombre: req.query.nombre as string | undefined,
      disponible: req.query.disponible !== undefined ? req.query.disponible === 'true' : undefined,
      destacado: req.query.destacado !== undefined ? req.query.destacado === 'true' : undefined,
      esVegetariano: req.query.esVegetariano !== undefined ? req.query.esVegetariano === 'true' : undefined,
      esVegano: req.query.esVegano !== undefined ? req.query.esVegano === 'true' : undefined,
      sinGluten: req.query.sinGluten !== undefined ? req.query.sinGluten === 'true' : undefined,
      esPicante: req.query.esPicante !== undefined ? req.query.esPicante === 'true' : undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
    };

    const resultado = await this.itemsMenuService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Items del menú obtenidos exitosamente');
  });

  /**
   * Obtiene un item del menú por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const item = await this.itemsMenuService.obtenerPorId(id);

    if (!item) {
      return this.responseUtil.error(res, 'Item del menú no encontrado', 404, 'ITEM_MENU_NOT_FOUND');
    }

    return this.responseUtil.success(res, item, 'Item del menú obtenido exitosamente', 200);
  });

  /**
   * Obtiene todos los items del menú de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const items = await this.itemsMenuService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, items, 'Items del menú obtenidos exitosamente', 200);
  });

  /**
   * Obtiene todos los items disponibles del menú de un restaurante específico (público, no requiere autenticación)
   */
  public obtenerPorRestauranteIdPublico = this.asyncHandler(async (req, res) => {
    const { restauranteId } = req.params;
    const items = await this.itemsMenuService.obtenerPorRestauranteId(restauranteId, true); // Solo disponibles

    return this.responseUtil.success(res, items, 'Items del menú obtenidos exitosamente', 200);
  });

  /**
   * Obtiene un item del menú por ID (público, no requiere autenticación)
   */
  public obtenerPorIdPublico = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const item = await this.itemsMenuService.obtenerPorId(id);

    if (!item) {
      return this.responseUtil.error(res, 'Item del menú no encontrado', 404, 'ITEM_MENU_NOT_FOUND');
    }

    // Solo devolver si está disponible
    if (!item.disponible) {
      return this.responseUtil.error(res, 'Item del menú no disponible', 404, 'ITEM_MENU_NOT_AVAILABLE');
    }

    return this.responseUtil.success(res, item, 'Item del menú obtenido exitosamente', 200);
  });

  /**
   * Obtiene todos los items del menú de una categoría específica
   */
  public obtenerPorCategoriaId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { categoriaId } = req.params;
    const items = await this.itemsMenuService.obtenerPorCategoriaId(categoriaId);

    return this.responseUtil.success(res, items, 'Items del menú obtenidos exitosamente', 200);
  });

  /**
   * Crea un nuevo item del menú
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearItemMenuDto = this.getBody<CrearItemMenuDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const item = await this.itemsMenuService.crear(crearItemMenuDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, item, 'Item del menú creado exitosamente', 201);
  });

  /**
   * Actualiza un item del menú
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarItemMenuDto = this.getBody<ActualizarItemMenuDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const item = await this.itemsMenuService.actualizar(id, actualizarItemMenuDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, item, 'Item del menú actualizado exitosamente', 200);
  });

  /**
   * Elimina un item del menú
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.itemsMenuService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Item del menú eliminado exitosamente', 200);
  });
}

