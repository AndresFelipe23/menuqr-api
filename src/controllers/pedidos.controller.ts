import { PedidosService } from '../services/pedidos.service';
import { BaseController } from './base.controller';
import { CrearPedidoDto, ActualizarPedidoDto, QueryPedidoDto, EstadoPedido } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class PedidosController extends BaseController {
  private pedidosService = new PedidosService();

  /**
   * Obtiene todos los pedidos con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryPedidoDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      mesaId: req.query.mesaId as string | undefined,
      meseroAsignadoId: req.query.meseroAsignadoId as string | undefined,
      estado: req.query.estado as EstadoPedido | undefined,
      nombreCliente: req.query.nombreCliente as string | undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'desc',
    };

    const resultado = await this.pedidosService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Pedidos obtenidos exitosamente');
  });

  /**
   * Obtiene un pedido por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const pedido = await this.pedidosService.obtenerPorId(id);

    if (!pedido) {
      return this.responseUtil.error(res, 'Pedido no encontrado', 404, 'PEDIDO_NOT_FOUND');
    }

    return this.responseUtil.success(res, pedido, 'Pedido obtenido exitosamente', 200);
  });

  /**
   * Obtiene todos los pedidos de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const pedidos = await this.pedidosService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, pedidos, 'Pedidos obtenidos exitosamente', 200);
  });

  /**
   * Obtiene todos los pedidos de una mesa específica
   */
  public obtenerPorMesaId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { mesaId } = req.params;
    const pedidos = await this.pedidosService.obtenerPorMesaId(mesaId);

    return this.responseUtil.success(res, pedidos, 'Pedidos obtenidos exitosamente', 200);
  });

  /**
   * Crea un nuevo pedido (público, sin autenticación)
   */
  public crearPublico = this.asyncHandler(async (req, res) => {
    const crearPedidoDto = this.getBody<CrearPedidoDto>(req);
    const requestInfo = {
      metodoHttp: req.method,
      ruta: req.path,
      endpoint: req.originalUrl || req.url,
      direccionIp: req.ip || (req as any).socket?.remoteAddress,
      agenteUsuario: req.get('user-agent') || undefined,
    };

    // Si no hay mesaId, crear una mesa virtual temporal
    if (!crearPedidoDto.mesaId) {
      return this.responseUtil.error(res, 'El número de mesa es requerido', 400, 'MESA_REQUIRED');
    }

    const pedido = await this.pedidosService.crear(crearPedidoDto, undefined, requestInfo);
    return this.responseUtil.success(res, pedido, 'Pedido creado exitosamente', 201);
  });

  /**
   * Crea un nuevo pedido
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearPedidoDto = this.getBody<CrearPedidoDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const pedido = await this.pedidosService.crear(crearPedidoDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, pedido, 'Pedido creado exitosamente', 201);
  });

  /**
   * Actualiza un pedido
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarPedidoDto = this.getBody<ActualizarPedidoDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const pedido = await this.pedidosService.actualizar(id, actualizarPedidoDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, pedido, 'Pedido actualizado exitosamente', 200);
  });

  /**
   * Cambia el estado de un pedido
   */
  public cambiarEstado = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { estado, notas } = req.body;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    if (!estado) {
      return this.responseUtil.error(res, 'El estado es requerido', 400, 'ESTADO_REQUIRED');
    }

    const pedido = await this.pedidosService.cambiarEstado(id, estado as EstadoPedido, usuarioId, notas, requestInfo);
    return this.responseUtil.success(res, pedido, 'Estado del pedido actualizado exitosamente', 200);
  });

  /**
   * Confirma un pedido pendiente de confirmación
   */
  public confirmarPedido = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const pedido = await this.pedidosService.confirmarPedido(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, pedido, 'Pedido confirmado exitosamente', 200);
  });

  /**
   * Actualiza el estado de un item individual del pedido
   */
  public actualizarEstadoItem = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { itemId } = req.params;
    const { estado, notas } = req.body;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    if (!estado) {
      return this.responseUtil.error(res, 'El estado es requerido', 400, 'ESTADO_REQUIRED');
    }

    const pedido = await this.pedidosService.actualizarEstadoItem(itemId, estado, usuarioId, notas, requestInfo);
    return this.responseUtil.success(res, pedido, 'Estado del item actualizado exitosamente', 200);
  });

  /**
   * Obtiene el historial de cambios de estado de un pedido
   */
  public obtenerHistorial = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const historial = await this.pedidosService.obtenerHistorial(id);
    return this.responseUtil.success(res, historial, 'Historial obtenido exitosamente', 200);
  });

  /**
   * Elimina un pedido
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.pedidosService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Pedido eliminado exitosamente', 200);
  });
}

