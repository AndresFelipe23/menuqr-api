import { BaseController } from './base.controller';
import { RolesService } from '../services/roles.service';
import { CrearRolDto, ActualizarRolDto, AsignarPermisosDto } from '../dto';
import { getClientIp } from '../utils/helpers';

export class RolesController extends BaseController {
  private rolesService = new RolesService();

  /**
   * Obtiene todos los roles
   */
  public obtenerTodos = this.asyncHandler(async (req, res) => {
    const roles = await this.rolesService.obtenerTodos();
    return this.responseUtil.success(res, roles, 'Roles obtenidos exitosamente', 200);
  });

  /**
   * Obtiene un rol por ID
   */
  public obtenerPorId = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const rol = await this.rolesService.obtenerPorId(id);

    if (!rol) {
      return this.responseUtil.error(res, 'Rol no encontrado', 404, 'ROL_NOT_FOUND');
    }

    return this.responseUtil.success(res, rol, 'Rol obtenido exitosamente', 200);
  });

  /**
   * Crea un nuevo rol
   */
  public crear = this.asyncHandler(async (req, res) => {
    const crearRolDto = this.getBody<CrearRolDto>(req);
    const rol = await this.rolesService.crear(crearRolDto);
    return this.responseUtil.success(res, rol, 'Rol creado exitosamente', 201);
  });

  /**
   * Actualiza un rol
   */
  public actualizar = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const actualizarRolDto = this.getBody<ActualizarRolDto>(req);
    const rol = await this.rolesService.actualizar(id, actualizarRolDto);
    return this.responseUtil.success(res, rol, 'Rol actualizado exitosamente', 200);
  });

  /**
   * Elimina un rol
   */
  public eliminar = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    await this.rolesService.eliminar(id);
    return this.responseUtil.success(res, null, 'Rol eliminado exitosamente', 200);
  });

  /**
   * Asigna permisos a un rol
   */
  public asignarPermisos = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const asignarPermisosDto = this.getBody<AsignarPermisosDto>(req);
    const rol = await this.rolesService.asignarPermisos(id, asignarPermisosDto);
    return this.responseUtil.success(res, rol, 'Permisos asignados exitosamente', 200);
  });

  /**
   * Obtiene todos los permisos disponibles
   */
  public obtenerPermisosDisponibles = this.asyncHandler(async (req, res) => {
    const permisos = await this.rolesService.obtenerPermisosDisponibles();
    return this.responseUtil.success(res, permisos, 'Permisos obtenidos exitosamente', 200);
  });
}

