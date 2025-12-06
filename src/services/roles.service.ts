import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearRolDto, ActualizarRolDto, AsignarPermisosDto } from '../dto';

export interface RolConPermisos {
  id: string;
  nombre: string;
  descripcion: string | null;
  permisos: Array<{
    id: string;
    codigo: string;
    nombre: string;
    modulo: string | null;
  }>;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export class RolesService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Obtiene todos los roles con sus permisos
   */
  async obtenerTodos(): Promise<RolConPermisos[]> {
    const roles = await AppDataSource.query(`
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.fecha_creacion,
        r.fecha_actualizacion
      FROM roles r
      ORDER BY r.nombre
    `);

    const rolesConPermisos: RolConPermisos[] = [];

    for (const rol of roles) {
      const permisos = await AppDataSource.query(`
        SELECT 
          p.id,
          p.codigo,
          p.nombre,
          p.modulo
        FROM permisos p
        INNER JOIN roles_permisos rp ON rp.permiso_id = p.id
        WHERE rp.rol_id = @0
        ORDER BY p.modulo, p.codigo
      `, [rol.id]);

      rolesConPermisos.push({
        id: rol.id,
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        permisos: permisos.map((p: any) => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          modulo: p.modulo,
        })),
        fechaCreacion: rol.fecha_creacion,
        fechaActualizacion: rol.fecha_actualizacion,
      });
    }

    return rolesConPermisos;
  }

  /**
   * Obtiene un rol por ID con sus permisos
   */
  async obtenerPorId(rolId: string): Promise<RolConPermisos | null> {
    const roles = await AppDataSource.query(`
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.fecha_creacion,
        r.fecha_actualizacion
      FROM roles r
      WHERE r.id = @0
    `, [rolId]);

    if (!roles || roles.length === 0) {
      return null;
    }

    const rol = roles[0];

    const permisos = await AppDataSource.query(`
      SELECT 
        p.id,
        p.codigo,
        p.nombre,
        p.modulo
      FROM permisos p
      INNER JOIN roles_permisos rp ON rp.permiso_id = p.id
      WHERE rp.rol_id = @0
      ORDER BY p.modulo, p.codigo
    `, [rol.id]);

    return {
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      permisos: permisos.map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        modulo: p.modulo,
      })),
      fechaCreacion: rol.fecha_creacion,
      fechaActualizacion: rol.fecha_actualizacion,
    };
  }

  /**
   * Crea un nuevo rol
   */
  async crear(crearRolDto: CrearRolDto): Promise<RolConPermisos> {
    // Verificar que el nombre no exista
    const existe = await AppDataSource.query(`
      SELECT id FROM roles WHERE nombre = @0
    `, [crearRolDto.nombre]);

    if (existe && existe.length > 0) {
      this.handleError('Ya existe un rol con ese nombre', null, 409);
    }

    // Crear el rol
    const resultado = await AppDataSource.query(`
      INSERT INTO roles (nombre, descripcion)
      OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.descripcion, INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
      VALUES (@0, @1)
    `, [crearRolDto.nombre, crearRolDto.descripcion || null]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear el rol', null, 500);
    }

    const nuevoRol = resultado[0];

    this.logger.info('Rol creado exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'rol',
      entidadId: nuevoRol.id,
      detalle: { nombre: nuevoRol.nombre },
    });

    return {
      id: nuevoRol.id,
      nombre: nuevoRol.nombre,
      descripcion: nuevoRol.descripcion,
      permisos: [],
      fechaCreacion: nuevoRol.fecha_creacion,
      fechaActualizacion: nuevoRol.fecha_actualizacion,
    };
  }

  /**
   * Actualiza un rol
   */
  async actualizar(rolId: string, actualizarRolDto: ActualizarRolDto): Promise<RolConPermisos> {
    // Verificar que el rol existe
    const rolExistente = await this.obtenerPorId(rolId);
    if (!rolExistente) {
      this.handleError('Rol no encontrado', null, 404);
    }

    // Si se está actualizando el nombre, verificar que no exista otro rol con ese nombre
    if (actualizarRolDto.nombre && actualizarRolDto.nombre !== rolExistente!.nombre) {
      const existe = await AppDataSource.query(`
        SELECT id FROM roles WHERE nombre = @0 AND id != @1
      `, [actualizarRolDto.nombre, rolId]);

      if (existe && existe.length > 0) {
        this.handleError('Ya existe otro rol con ese nombre', null, 409);
      }
    }

    // Actualizar el rol
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarRolDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarRolDto.nombre);
      indice++;
    }

    if (actualizarRolDto.descripcion !== undefined) {
      campos.push(`descripcion = @${indice}`);
      valores.push(actualizarRolDto.descripcion);
      indice++;
    }

    if (campos.length === 0) {
      return rolExistente!;
    }

    valores.push(rolId);

    await AppDataSource.query(`
      UPDATE roles
      SET ${campos.join(', ')}
      WHERE id = @${indice}
    `, valores);

    this.logger.info('Rol actualizado exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'rol',
      entidadId: rolId,
      detalle: actualizarRolDto,
    });

    return await this.obtenerPorId(rolId) as RolConPermisos;
  }

  /**
   * Elimina un rol
   */
  async eliminar(rolId: string): Promise<void> {
    const rol = await this.obtenerPorId(rolId);
    if (!rol) {
      this.handleError('Rol no encontrado', null, 404);
    }

    // Verificar que no esté siendo usado por usuarios
    const usuariosConRol = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM roles_usuario
      WHERE rol_id = @0
    `, [rolId]);

    if (usuariosConRol && usuariosConRol[0] && usuariosConRol[0].total > 0) {
      this.handleError(
        `No se puede eliminar el rol porque está asignado a ${usuariosConRol[0].total} usuario(s)`,
        null,
        400
      );
    }

    // Eliminar relaciones de permisos primero (cascade debería hacerlo, pero por si acaso)
    await AppDataSource.query(`
      DELETE FROM roles_permisos WHERE rol_id = @0
    `, [rolId]);

    // Eliminar el rol
    await AppDataSource.query(`
      DELETE FROM roles WHERE id = @0
    `, [rolId]);

    this.logger.info('Rol eliminado exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'rol',
      entidadId: rolId,
      detalle: { nombre: rol!.nombre },
    });
  }

  /**
   * Asigna permisos a un rol (reemplaza los permisos existentes)
   */
  async asignarPermisos(rolId: string, asignarPermisosDto: AsignarPermisosDto): Promise<RolConPermisos> {
    const rol = await this.obtenerPorId(rolId);
    if (!rol) {
      this.handleError('Rol no encontrado', null, 404);
    }

    // Verificar que todos los permisos existan
    const placeholders = asignarPermisosDto.permisoIds.map((_, i) => `@${i}`).join(',');
    const permisosExistentes = await AppDataSource.query(`
      SELECT id FROM permisos WHERE id IN (${placeholders})
    `, asignarPermisosDto.permisoIds);

    if (permisosExistentes.length !== asignarPermisosDto.permisoIds.length) {
      this.handleError('Uno o más permisos no existen', null, 404);
    }

    // Eliminar permisos actuales
    await AppDataSource.query(`
      DELETE FROM roles_permisos WHERE rol_id = @0
    `, [rolId]);

    // Asignar nuevos permisos
    for (const permisoId of asignarPermisosDto.permisoIds) {
      await AppDataSource.query(`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES (@0, @1)
      `, [rolId, permisoId]);
    }

    this.logger.info('Permisos asignados al rol exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'rol',
      entidadId: rolId,
      detalle: { 
        nombre: rol!.nombre,
        totalPermisos: asignarPermisosDto.permisoIds.length 
      },
    });

    return await this.obtenerPorId(rolId) as RolConPermisos;
  }

  /**
   * Obtiene todos los permisos disponibles
   */
  async obtenerPermisosDisponibles(): Promise<Array<{ id: string; codigo: string; nombre: string; modulo: string | null }>> {
    const permisos = await AppDataSource.query(`
      SELECT 
        id,
        codigo,
        nombre,
        modulo
      FROM permisos
      WHERE activo = 1
      ORDER BY modulo, codigo
    `);

    return permisos.map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      modulo: p.modulo,
    }));
  }
}

