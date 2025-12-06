import { BaseController } from './base.controller';
import { MesasService } from '../services/mesas.service';
import { CrearMesaDto, ActualizarMesaDto, QueryMesaDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class MesasController extends BaseController {
  private mesasService = new MesasService();

  /**
   * Obtiene todas las mesas con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryMesaDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      numero: req.query.numero as string | undefined,
      seccion: req.query.seccion as string | undefined,
      activa: req.query.activa !== undefined ? req.query.activa === 'true' : undefined,
      ocupada: req.query.ocupada !== undefined ? req.query.ocupada === 'true' : undefined,
      meseroAsignadoId: req.query.meseroAsignadoId as string | undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
    };

    const resultado = await this.mesasService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Mesas obtenidas exitosamente');
  });

  /**
   * Obtiene una mesa por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const mesa = await this.mesasService.obtenerPorId(id);

    if (!mesa) {
      return this.responseUtil.error(res, 'Mesa no encontrada', 404, 'MESA_NOT_FOUND');
    }

    return this.responseUtil.success(res, mesa, 'Mesa obtenida exitosamente', 200);
  });

  /**
   * Obtiene todas las mesas activas de un restaurante específico (público, no requiere autenticación)
   */
  public obtenerPorRestauranteIdPublico = this.asyncHandler(async (req, res) => {
    const { restauranteId } = req.params;
    const mesas = await this.mesasService.obtenerPorRestauranteId(restauranteId, true); // Solo activas

    return this.responseUtil.success(res, mesas, 'Mesas obtenidas exitosamente', 200);
  });

  /**
   * Obtiene todas las mesas de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const mesas = await this.mesasService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, mesas, 'Mesas obtenidas exitosamente', 200);
  });

  /**
   * Crea una nueva mesa
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearMesaDto = this.getBody<CrearMesaDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const mesa = await this.mesasService.crear(crearMesaDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, mesa, 'Mesa creada exitosamente', 201);
  });

  /**
   * Actualiza una mesa
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarMesaDto = this.getBody<ActualizarMesaDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const mesa = await this.mesasService.actualizar(id, actualizarMesaDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, mesa, 'Mesa actualizada exitosamente', 200);
  });

  /**
   * Regenera el código QR y la imagen QR de una mesa
   */
  public regenerarQR = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const mesa = await this.mesasService.regenerarQR(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, mesa, 'QR regenerado exitosamente', 200);
  });

  /**
   * Elimina una mesa
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.mesasService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Mesa eliminada exitosamente', 200);
  });
}

