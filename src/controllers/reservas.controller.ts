import { BaseController } from './base.controller';
import { ReservasService } from '../services/reservas.service';
import { CrearReservaDto, ActualizarReservaDto, QueryReservaDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class ReservasController extends BaseController {
  private reservasService = new ReservasService();

  /**
   * Obtiene todas las reservas con paginación y filtros
   */
  public obtenerTodas = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryReservaDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      mesaId: req.query.mesaId as string | undefined,
      estado: req.query.estado as string | undefined,
      correoCliente: req.query.correoCliente as string | undefined,
      telefonoCliente: req.query.telefonoCliente as string | undefined,
      fechaDesde: req.query.fechaDesde as string | undefined,
      fechaHasta: req.query.fechaHasta as string | undefined,
      confirmada: req.query.confirmada !== undefined ? req.query.confirmada === 'true' : undefined,
      cancelada: req.query.cancelada !== undefined ? req.query.cancelada === 'true' : undefined,
      meseroAsignadoId: req.query.meseroAsignadoId as string | undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
      ordenPor: (req.query.ordenPor as 'fecha_creacion' | 'fecha_reserva' | 'estado') || 'fecha_reserva',
    };

    const resultado = await this.reservasService.obtenerTodas(query);
    return this.responseUtil.paginated(res, resultado, 'Reservas obtenidas exitosamente');
  });

  /**
   * Obtiene una reserva por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const reserva = await this.reservasService.obtenerPorId(id);

    if (!reserva) {
      return this.responseUtil.error(res, 'Reserva no encontrada', 404, 'RESERVA_NOT_FOUND');
    }

    return this.responseUtil.success(res, reserva, 'Reserva obtenida exitosamente', 200);
  });

  /**
   * Crea una nueva reserva
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearReservaDto = this.getBody<CrearReservaDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const reserva = await this.reservasService.crear(crearReservaDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, reserva, 'Reserva creada exitosamente', 201);
  });

  /**
   * Actualiza una reserva
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarReservaDto = this.getBody<ActualizarReservaDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const reserva = await this.reservasService.actualizar(id, actualizarReservaDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, reserva, 'Reserva actualizada exitosamente', 200);
  });

  /**
   * Elimina una reserva (soft delete)
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.reservasService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Reserva eliminada exitosamente', 200);
  });

  /**
   * Confirma una reserva por código (público, no requiere autenticación)
   */
  public confirmarPorCodigo = this.asyncHandler(async (req, res) => {
    const { codigo } = req.params;
    const reserva = await this.reservasService.confirmarPorCodigo(codigo);
    return this.responseUtil.success(res, reserva, 'Reserva confirmada exitosamente', 200);
  });
}

