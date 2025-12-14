import { BaseController } from './base.controller';
import { ComentariosService } from '../services/comentarios.service';
import { CrearComentarioDto, ActualizarComentarioDto, QueryComentarioDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class ComentariosController extends BaseController {
  private comentariosService = new ComentariosService();

  /**
   * Obtiene todos los comentarios con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryComentarioDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      usuarioId: req.query.usuarioId as string | undefined,
      tipo: req.query.tipo as QueryComentarioDto['tipo'] | undefined,
      estado: req.query.estado as QueryComentarioDto['estado'] | undefined,
      prioridad: req.query.prioridad as QueryComentarioDto['prioridad'] | undefined,
      asunto: req.query.asunto as string | undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'desc',
    };

    const resultado = await this.comentariosService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Comentarios obtenidos exitosamente');
  });

  /**
   * Obtiene un comentario por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const comentario = await this.comentariosService.obtenerPorId(id);

    if (!comentario) {
      return this.responseUtil.error(res, 'Comentario no encontrado', 404, 'COMENTARIO_NOT_FOUND');
    }

    return this.responseUtil.success(res, comentario, 'Comentario obtenido exitosamente', 200);
  });

  /**
   * Crea un nuevo comentario
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearComentarioDto = this.getBody<CrearComentarioDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const comentario = await this.comentariosService.crear(crearComentarioDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, comentario, 'Comentario creado exitosamente', 201);
  });

  /**
   * Actualiza un comentario
   * Solo los Super Administradores pueden actualizar (principalmente el estado)
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarComentarioDto = this.getBody<ActualizarComentarioDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    // Verificar que el usuario sea Super Administrador
    if (!user?.rolNombre || user.rolNombre.toLowerCase() !== 'superadministrador') {
      return this.responseUtil.error(
        res,
        'Solo los Super Administradores pueden actualizar las solicitudes',
        403,
        'FORBIDDEN'
      );
    }

    const comentario = await this.comentariosService.actualizar(id, actualizarComentarioDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, comentario, 'Comentario actualizado exitosamente', 200);
  });

  /**
   * Responde a un comentario
   * Solo los Super Administradores pueden responder
   */
  public responder = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { respuesta } = this.getBody<{ respuesta: string }>(req);
    const user = req.user;
    const usuarioId = user?.id;
    const requestInfo = this.getRequestInfo(req);

    if (!usuarioId) {
      return this.responseUtil.error(res, 'Usuario no autenticado', 401, 'UNAUTHORIZED');
    }

    // Verificar que el usuario sea Super Administrador
    if (!user?.rolNombre || user.rolNombre.toLowerCase() !== 'superadministrador') {
      return this.responseUtil.error(
        res,
        'Solo los Super Administradores pueden responder a las solicitudes',
        403,
        'FORBIDDEN'
      );
    }

    if (!respuesta || respuesta.trim().length === 0) {
      return this.responseUtil.error(res, 'La respuesta es requerida', 400, 'RESPUESTA_REQUIRED');
    }

    const comentario = await this.comentariosService.responder(id, respuesta, usuarioId, requestInfo);
    return this.responseUtil.success(res, comentario, 'Respuesta agregada exitosamente', 200);
  });

  /**
   * Elimina un comentario
   * Solo el autor del comentario o un Super Administrador pueden eliminar
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id;

    if (!usuarioId) {
      return this.responseUtil.error(res, 'Usuario no autenticado', 401, 'UNAUTHORIZED');
    }

    // Verificar que el comentario existe y obtener sus datos
    const comentario = await this.comentariosService.obtenerPorId(id);
    if (!comentario) {
      return this.responseUtil.error(res, 'Comentario no encontrado', 404, 'COMENTARIO_NOT_FOUND');
    }

    // Verificar permisos: solo el autor o un Super Administrador pueden eliminar
    const esSuperAdmin = user?.rolNombre?.toLowerCase() === 'superadministrador';
    const esAutor = comentario.usuarioId === usuarioId;

    if (!esSuperAdmin && !esAutor) {
      return this.responseUtil.error(
        res,
        'Solo puedes eliminar tus propias solicitudes',
        403,
        'FORBIDDEN'
      );
    }

    const requestInfo = this.getRequestInfo(req);
    await this.comentariosService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Comentario eliminado exitosamente', 200);
  });
}

