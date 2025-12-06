import { BaseController } from './base.controller';
import { UsuariosService } from '../services/usuarios.service';
import { CrearUsuarioDto, ActualizarUsuarioDto, QueryUsuarioDto } from '../dto';
import { AuthenticatedRequest } from '../types/express.types';

export class UsuariosController extends BaseController {
  private usuariosService = new UsuariosService();

  /**
   * Obtiene todos los usuarios con paginación y filtros
   */
  public obtenerTodos = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const query: QueryUsuarioDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      restauranteId: req.query.restauranteId as string | undefined,
      correo: req.query.correo as string | undefined,
      nombre: req.query.nombre as string | undefined,
      rolId: req.query.rolId as string | undefined,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      correoVerificado: req.query.correoVerificado !== undefined ? req.query.correoVerificado === 'true' : undefined,
      orden: (req.query.orden as 'asc' | 'desc') || 'asc',
    };

    const resultado = await this.usuariosService.obtenerTodos(query);
    return this.responseUtil.paginated(res, resultado, 'Usuarios obtenidos exitosamente');
  });

  /**
   * Obtiene un usuario por ID
   */
  public obtenerPorId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const usuario = await this.usuariosService.obtenerPorId(id);

    if (!usuario) {
      return this.responseUtil.error(res, 'Usuario no encontrado', 404, 'USUARIO_NOT_FOUND');
    }

    return this.responseUtil.success(res, usuario, 'Usuario obtenido exitosamente', 200);
  });

  /**
   * Obtiene todos los usuarios de un restaurante específico
   */
  public obtenerPorRestauranteId = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { restauranteId } = req.params;
    const usuarios = await this.usuariosService.obtenerPorRestauranteId(restauranteId);

    return this.responseUtil.success(res, usuarios, 'Usuarios obtenidos exitosamente', 200);
  });

  /**
   * Crea un nuevo usuario
   */
  public crear = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const crearUsuarioDto = this.getBody<CrearUsuarioDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const usuario = await this.usuariosService.crear(crearUsuarioDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, usuario, 'Usuario creado exitosamente', 201);
  });

  /**
   * Actualiza un usuario
   */
  public actualizar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const actualizarUsuarioDto = this.getBody<ActualizarUsuarioDto>(req);
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    const usuario = await this.usuariosService.actualizar(id, actualizarUsuarioDto, usuarioId, requestInfo);
    return this.responseUtil.success(res, usuario, 'Usuario actualizado exitosamente', 200);
  });

  /**
   * Elimina un usuario (soft delete)
   */
  public eliminar = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const user = req.user;
    const usuarioId = user?.id || undefined;
    const requestInfo = this.getRequestInfo(req);

    await this.usuariosService.eliminar(id, usuarioId, requestInfo);
    return this.responseUtil.success(res, null, 'Usuario eliminado exitosamente', 200);
  });
}

