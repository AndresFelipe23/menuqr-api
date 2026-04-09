import { BaseController } from './base.controller';
import { RestaurantsService } from '../services/restaurants.service';
import { CrearRestauranteDto, ActualizarRestauranteDto, QueryRestauranteDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class RestaurantsController extends BaseController {
  private restaurantsService = new RestaurantsService();

  /**
   * Obtiene todos los restaurantes con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryRestauranteDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      nombre: req.query.nombre as string | undefined,
      slug: req.query.slug as string | undefined,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      estadoSuscripcion: req.query.estadoSuscripcion as string | undefined,
      ciudad: req.query.ciudad as string | undefined,
      pais: req.query.pais as string | undefined,
    };

    const resultado = await this.restaurantsService.obtenerTodos(query);
    return this.responseUtil.success(res, resultado, 'Restaurantes obtenidos exitosamente', 200);
  });

  /**
   * Obtiene un restaurante por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const restaurante = await this.restaurantsService.obtenerPorId(id);

    if (!restaurante) {
      return this.responseUtil.error(res, 'Restaurante no encontrado', 404, 'RESTAURANT_NOT_FOUND');
    }

    return this.responseUtil.success(res, restaurante, 'Restaurante obtenido exitosamente', 200);
  });

  /**
   * Obtiene un restaurante por slug (público)
   */
  public obtenerPorSlug = this.asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const restaurante = await this.restaurantsService.obtenerPorSlug(slug);

    if (!restaurante) {
      return this.responseUtil.error(res, 'Restaurante no encontrado', 404, 'RESTAURANT_NOT_FOUND');
    }

    return this.responseUtil.success(res, restaurante, 'Restaurante obtenido exitosamente', 200);
  });

  public redirigirMenuPdfPublico = this.asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const menuPdfUrl = await this.restaurantsService.obtenerMenuPdfUrlPublicaPorSlug(slug);

    if (!menuPdfUrl) {
      return this.responseUtil.error(res, 'PDF de menú no disponible', 404, 'MENU_PDF_NOT_FOUND');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    return res.redirect(302, menuPdfUrl);
  });

  /**
   * Obtiene todos los restaurantes activos (público)
   */
  public obtenerTodosPublicos = this.asyncHandler(async (req, res) => {
    const restaurantes = await this.restaurantsService.obtenerTodosPublicos();
    return this.responseUtil.success(res, restaurantes, 'Restaurantes obtenidos exitosamente', 200);
  });

  /**
   * Crea un nuevo restaurante
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearRestauranteDto = this.getBody<CrearRestauranteDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const restaurante = await this.restaurantsService.crear(crearRestauranteDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, restaurante, 'Restaurante creado exitosamente', 201);
  });

  /**
   * Actualiza un restaurante
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarRestauranteDto = this.getBody<ActualizarRestauranteDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const restaurante = await this.restaurantsService.actualizar(id, actualizarRestauranteDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, restaurante, 'Restaurante actualizado exitosamente', 200);
  });

  /**
   * Elimina un restaurante (soft delete)
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.restaurantsService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Restaurante eliminado exitosamente', 200);
  });

  public generarQrMenuPdf = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const forzarRegeneracion = req.query.forzar === 'true';
    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;

    const restaurante = await this.restaurantsService.generarQrMenuPdf(id, forzarRegeneracion, requestBaseUrl);
    return this.responseUtil.success(
      res,
      restaurante,
      forzarRegeneracion ? 'QR del PDF regenerado exitosamente' : 'QR del PDF generado exitosamente',
      200
    );
  });
}

