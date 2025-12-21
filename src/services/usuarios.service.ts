import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearUsuarioDto, ActualizarUsuarioDto, QueryUsuarioDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { SuscripcionesService } from './suscripciones.service';

export interface Usuario {
  id: string;
  correo: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  avatarUrl: string | null;
  restauranteId: string | null;
  correoVerificado: boolean;
  activo: boolean;
  ultimoAcceso: Date | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaEliminacion: Date | null;
}

export interface UsuarioConRol extends Usuario {
  rolId?: string | null;
  rolNombre?: string | null;
  restauranteNombre?: string | null;
}

export interface PaginatedUsuarios {
  items: UsuarioConRol[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class UsuariosService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz Usuario
   */
  private mapToUsuario(row: any): Usuario {
    return {
      id: row.id,
      correo: row.correo,
      nombre: row.nombre,
      apellido: row.apellido,
      telefono: row.telefono,
      avatarUrl: row.avatar_url,
      restauranteId: row.restaurante_id,
      correoVerificado: row.correo_verificado === 1 || row.correo_verificado === true,
      activo: row.activo === 1 || row.activo === true,
      ultimoAcceso: row.ultimo_acceso,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
      fechaEliminacion: row.fecha_eliminacion,
    };
  }

  /**
   * Obtiene todos los usuarios con paginación y filtros
   */
  async obtenerTodos(query: QueryUsuarioDto): Promise<PaginatedUsuarios> {
    this.logOperation('obtener todos los usuarios', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = ['u.fecha_eliminacion IS NULL'];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`u.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.correo) {
      condiciones.push(`u.correo LIKE @${indice}`);
      parametros.push(`%${query.correo}%`);
      indice++;
    }

    if (query.nombre) {
      condiciones.push(`(u.nombre LIKE @${indice} OR u.apellido LIKE @${indice})`);
      parametros.push(`%${query.nombre}%`);
      parametros.push(`%${query.nombre}%`);
      indice += 2;
    }

    if (query.rolId) {
      condiciones.push(`ru.rol_id = @${indice}`);
      parametros.push(query.rolId);
      indice++;
    }

    if (query.activo !== undefined) {
      condiciones.push(`u.activo = @${indice}`);
      parametros.push(query.activo ? 1 : 0);
      indice++;
    }

    if (query.correoVerificado !== undefined) {
      condiciones.push(`u.correo_verificado = @${indice}`);
      parametros.push(query.correoVerificado ? 1 : 0);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM usuarios u
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener usuarios con información de rol y restaurante
    const usuarios = await AppDataSource.query(`
      SELECT DISTINCT
        u.id, u.correo, u.nombre, u.apellido, u.telefono, u.avatar_url,
        u.restaurante_id, u.correo_verificado, u.activo, u.ultimo_acceso,
        u.fecha_creacion, u.fecha_actualizacion, u.fecha_eliminacion,
        ru.rol_id,
        r.nombre as rol_nombre,
        rest.nombre as restaurante_nombre
      FROM usuarios u
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ru.rol_id
      LEFT JOIN restaurantes rest ON rest.id = u.restaurante_id
      ${whereClause}
      ORDER BY u.fecha_creacion ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    return {
      items: usuarios.map((u: any) => ({
        ...this.mapToUsuario(u),
        rolId: u.rol_id,
        rolNombre: u.rol_nombre,
        restauranteNombre: u.restaurante_nombre,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Obtiene un usuario por ID
   */
  async obtenerPorId(usuarioId: string): Promise<UsuarioConRol | null> {
    this.logOperation(`obtener usuario por ID: ${usuarioId}`);

    const usuarios = await AppDataSource.query(`
      SELECT 
        u.id, u.correo, u.nombre, u.apellido, u.telefono, u.avatar_url,
        u.restaurante_id, u.correo_verificado, u.activo, u.ultimo_acceso,
        u.fecha_creacion, u.fecha_actualizacion, u.fecha_eliminacion,
        ru.rol_id,
        r.nombre as rol_nombre,
        rest.nombre as restaurante_nombre
      FROM usuarios u
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ru.rol_id
      LEFT JOIN restaurantes rest ON rest.id = u.restaurante_id
      WHERE u.id = @0 AND u.fecha_eliminacion IS NULL
    `, [usuarioId]);

    if (!usuarios || usuarios.length === 0) {
      return null;
    }

    const u = usuarios[0];
    return {
      ...this.mapToUsuario(u),
      rolId: u.rol_id,
      rolNombre: u.rol_nombre,
      restauranteNombre: u.restaurante_nombre,
    };
  }

  /**
   * Obtiene todos los usuarios de un restaurante específico
   */
  async obtenerPorRestauranteId(restauranteId: string): Promise<UsuarioConRol[]> {
    this.logOperation(`obtener usuarios por restauranteId: ${restauranteId}`);

    const usuarios = await AppDataSource.query(`
      SELECT 
        u.id, u.correo, u.nombre, u.apellido, u.telefono, u.avatar_url,
        u.restaurante_id, u.correo_verificado, u.activo, u.ultimo_acceso,
        u.fecha_creacion, u.fecha_actualizacion, u.fecha_eliminacion,
        ru.rol_id,
        r.nombre as rol_nombre,
        rest.nombre as restaurante_nombre
      FROM usuarios u
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ru.rol_id
      LEFT JOIN restaurantes rest ON rest.id = u.restaurante_id
      WHERE u.restaurante_id = @0 AND u.fecha_eliminacion IS NULL
      ORDER BY u.fecha_creacion DESC
    `, [restauranteId]);

    return usuarios.map((u: any) => ({
      ...this.mapToUsuario(u),
      rolId: u.rol_id,
      rolNombre: u.rol_nombre,
      restauranteNombre: u.restaurante_nombre,
    }));
  }

  /**
   * Crea un nuevo usuario
   */
  async crear(
    crearUsuarioDto: CrearUsuarioDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<UsuarioConRol> {
    this.logOperation('crear usuario', { data: { ...crearUsuarioDto, password: '***' }, usuarioId });

    // Verificar que el correo no exista
    const usuarioExistente = await AppDataSource.query(
      `SELECT id FROM usuarios WHERE correo = @0 AND fecha_eliminacion IS NULL`,
      [crearUsuarioDto.correo]
    );

    if (usuarioExistente && usuarioExistente.length > 0) {
      this.handleError('Ya existe un usuario con ese correo', null, 409);
    }

    // Verificar que el restaurante existe si se proporciona
    if (crearUsuarioDto.restauranteId) {
      const restaurante = await AppDataSource.query(
        `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
        [crearUsuarioDto.restauranteId]
      );

      if (!restaurante || restaurante.length === 0) {
        this.handleError('Restaurante no encontrado', null, 404);
      }

      // Verificar límites de suscripción (solo para usuarios con restaurante)
      try {
        const suscripcionesService = new SuscripcionesService();
        const limites = await suscripcionesService.verificarLimites(crearUsuarioDto.restauranteId, 'usuarios');
        
        if (!limites.permitido) {
          const mensaje = limites.limite === -1 
            ? 'No se puede crear más usuarios. Por favor, actualiza tu plan para obtener límites ilimitados.'
            : `Has alcanzado el límite de ${limites.limite} usuario(s) de tu plan actual (${limites.actual}/${limites.limite}). ` +
              'Por favor, actualiza tu plan para crear más usuarios.';
          this.handleError(mensaje, null, 403);
        }
      } catch (error: any) {
        // Si hay error al verificar límites, continuar (no bloquear)
        this.logger.warn('Error al verificar límites de suscripción', {
          categoria: this.logCategory,
          restauranteId: crearUsuarioDto.restauranteId,
          detalle: { error: error.message },
        });
      }
    }

    // Verificar que el rol existe si se proporciona
    if (crearUsuarioDto.rolId) {
      const rol = await AppDataSource.query(
        `SELECT id, nombre FROM roles WHERE id = @0`,
        [crearUsuarioDto.rolId]
      );

      if (!rol || rol.length === 0) {
        this.handleError('Rol no encontrado', null, 404);
      }
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(crearUsuarioDto.password, saltRounds);

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Crear el usuario
    const resultado = await AppDataSource.query(`
      INSERT INTO usuarios (
        correo, hash_contrasena, nombre, apellido, telefono, avatar_url,
        restaurante_id, correo_verificado, activo,
        fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.correo, INSERTED.nombre, INSERTED.apellido,
        INSERTED.telefono, INSERTED.avatar_url, INSERTED.restaurante_id,
        INSERTED.correo_verificado, INSERTED.activo, INSERTED.ultimo_acceso,
        INSERTED.fecha_creacion, INSERTED.fecha_actualizacion, INSERTED.fecha_eliminacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @9
      )
    `, [
      crearUsuarioDto.correo,
      hashPassword,
      crearUsuarioDto.nombre || null,
      crearUsuarioDto.apellido || null,
      crearUsuarioDto.telefono || null,
      crearUsuarioDto.avatarUrl || null,
      crearUsuarioDto.restauranteId || null,
      crearUsuarioDto.correoVerificado !== undefined ? (crearUsuarioDto.correoVerificado ? 1 : 0) : 0,
      crearUsuarioDto.activo !== undefined ? (crearUsuarioDto.activo ? 1 : 0) : 1,
      fechaActual, // fecha_creacion en hora local de Montería
      fechaActual, // fecha_actualizacion en hora local de Montería
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear el usuario', null, 500);
    }

    const nuevoUsuario = resultado[0];
    const usuarioMapeado = this.mapToUsuario(nuevoUsuario);

    // Asignar rol si se proporciona
    if (crearUsuarioDto.rolId) {
      await AppDataSource.query(`
        INSERT INTO roles_usuario (usuario_id, rol_id, restaurante_id)
        VALUES (@0, @1, @2)
      `, [usuarioMapeado.id, crearUsuarioDto.rolId, crearUsuarioDto.restauranteId || null]);
    }

    // Obtener el usuario completo con rol
    const usuarioCompleto = await this.obtenerPorId(usuarioMapeado.id) as UsuarioConRol;

    this.logger.info('Usuario creado exitosamente', {
      categoria: this.logCategory,
      restauranteId: crearUsuarioDto.restauranteId ?? undefined,
      usuarioId: usuarioId,
      entidadTipo: 'usuario',
      entidadId: usuarioMapeado.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: usuarioMapeado.id,
        correo: usuarioMapeado.correo,
        restauranteId: usuarioMapeado.restauranteId,
        activo: usuarioMapeado.activo,
      },
      metadata: {
        tipoOperacion: 'crear_usuario',
        camposProporcionados: Object.keys(crearUsuarioDto).filter(k => k !== 'password'),
        timestamp: new Date().toISOString(),
      },
    });

    return usuarioCompleto;
  }

  /**
   * Actualiza un usuario
   */
  async actualizar(
    usuarioId: string,
    actualizarUsuarioDto: ActualizarUsuarioDto,
    usuarioIdActualizador?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<UsuarioConRol> {
    this.logOperation(`actualizar usuario: ${usuarioId}`, { data: { ...actualizarUsuarioDto, password: actualizarUsuarioDto.password ? '***' : undefined }, usuarioIdActualizador });

    const usuario = await this.obtenerPorId(usuarioId);
    if (!usuario) {
      this.handleError('Usuario no encontrado', null, 404);
    }

    // Si se está actualizando el correo, verificar que no esté duplicado
    if (actualizarUsuarioDto.correo && actualizarUsuarioDto.correo !== usuario!.correo) {
      const correoExistente = await AppDataSource.query(
        `SELECT id FROM usuarios WHERE correo = @0 AND id != @1 AND fecha_eliminacion IS NULL`,
        [actualizarUsuarioDto.correo, usuarioId]
      );

      if (correoExistente && correoExistente.length > 0) {
        this.handleError('Ya existe otro usuario con ese correo', null, 409);
      }
    }

    // Verificar que el restaurante existe si se proporciona
    if (actualizarUsuarioDto.restauranteId !== undefined && actualizarUsuarioDto.restauranteId !== null) {
      const restaurante = await AppDataSource.query(
        `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
        [actualizarUsuarioDto.restauranteId]
      );

      if (!restaurante || restaurante.length === 0) {
        this.handleError('Restaurante no encontrado', null, 404);
      }
    }

    // Verificar que el rol existe si se proporciona
    if (actualizarUsuarioDto.rolId !== undefined && actualizarUsuarioDto.rolId !== null) {
      const rol = await AppDataSource.query(
        `SELECT id, nombre FROM roles WHERE id = @0`,
        [actualizarUsuarioDto.rolId]
      );

      if (!rol || rol.length === 0) {
        this.handleError('Rol no encontrado', null, 404);
      }

      // Verificar que no sea SuperAdministrador
      const nombreRol = rol[0].nombre?.toLowerCase();
      if (nombreRol === 'superadministrador' || nombreRol === 'super administrador') {
        this.handleError(
          'El rol SuperAdministrador no puede ser asignado. Este rol es exclusivo para el dueño del sistema.',
          null,
          403
        );
      }
    }

    // Construir la consulta UPDATE dinámicamente
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarUsuarioDto.correo !== undefined) {
      campos.push(`correo = @${indice}`);
      valores.push(actualizarUsuarioDto.correo);
      indice++;
    }

    if (actualizarUsuarioDto.password !== undefined) {
      const saltRounds = 10;
      const hashPassword = await bcrypt.hash(actualizarUsuarioDto.password, saltRounds);
      campos.push(`hash_contrasena = @${indice}`);
      valores.push(hashPassword);
      indice++;
    }

    if (actualizarUsuarioDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarUsuarioDto.nombre);
      indice++;
    }

    if (actualizarUsuarioDto.apellido !== undefined) {
      campos.push(`apellido = @${indice}`);
      valores.push(actualizarUsuarioDto.apellido);
      indice++;
    }

    if (actualizarUsuarioDto.telefono !== undefined) {
      campos.push(`telefono = @${indice}`);
      valores.push(actualizarUsuarioDto.telefono);
      indice++;
    }

    if (actualizarUsuarioDto.avatarUrl !== undefined) {
      campos.push(`avatar_url = @${indice}`);
      valores.push(actualizarUsuarioDto.avatarUrl);
      indice++;
    }

    if (actualizarUsuarioDto.restauranteId !== undefined) {
      campos.push(`restaurante_id = @${indice}`);
      valores.push(actualizarUsuarioDto.restauranteId);
      indice++;
    }

    if (actualizarUsuarioDto.correoVerificado !== undefined) {
      campos.push(`correo_verificado = @${indice}`);
      valores.push(actualizarUsuarioDto.correoVerificado ? 1 : 0);
      indice++;
    }

    if (actualizarUsuarioDto.activo !== undefined) {
      campos.push(`activo = @${indice}`);
      valores.push(actualizarUsuarioDto.activo ? 1 : 0);
      indice++;
    }

    if (campos.length === 0) {
      // Si no hay campos para actualizar, solo actualizar el rol si es necesario
      if (actualizarUsuarioDto.rolId !== undefined) {
        await this.asignarRol(usuarioId, actualizarUsuarioDto.rolId, actualizarUsuarioDto.restauranteId || usuario!.restauranteId);
      }
      return await this.obtenerPorId(usuarioId) as UsuarioConRol;
    }

    // Agregar fecha_actualizacion en hora local de Montería
    const fechaActual = getMonteriaLocalDate();
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    indice++;

    valores.push(usuarioId);

    await AppDataSource.query(`
      UPDATE usuarios
      SET ${campos.join(', ')}
      WHERE id = @${indice}
    `, valores);

    // Actualizar rol si se proporciona
    if (actualizarUsuarioDto.rolId !== undefined) {
      await this.asignarRol(usuarioId, actualizarUsuarioDto.rolId, actualizarUsuarioDto.restauranteId || usuario!.restauranteId);
    }

    const usuarioActualizado = await this.obtenerPorId(usuarioId) as UsuarioConRol;

    // Preparar información de cambios
    const camposActualizados = Object.keys(actualizarUsuarioDto).filter(
      key => actualizarUsuarioDto[key as keyof ActualizarUsuarioDto] !== undefined && key !== 'password'
    );

    this.logger.info('Usuario actualizado exitosamente', {
      categoria: this.logCategory,
      restauranteId: usuarioActualizado.restauranteId ?? undefined,
      usuarioId: usuarioIdActualizador,
      entidadTipo: 'usuario',
      entidadId: usuarioId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: usuarioActualizado.id,
        correo: usuarioActualizado.correo,
        restauranteId: usuarioActualizado.restauranteId,
        camposActualizados: camposActualizados,
        valoresAnteriores: usuario ? {
          correo: usuario.correo,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          telefono: usuario.telefono,
          activo: usuario.activo,
          restauranteId: usuario.restauranteId,
          rolId: usuario.rolId,
        } : null,
        valoresNuevos: { ...actualizarUsuarioDto, password: actualizarUsuarioDto.password ? '***' : undefined },
      },
      metadata: {
        tipoOperacion: 'actualizar_usuario',
        camposModificados: camposActualizados,
        cantidadCamposModificados: camposActualizados.length,
        timestamp: new Date().toISOString(),
      },
    });

    return usuarioActualizado;
  }

  /**
   * Asigna un rol a un usuario
   */
  private async asignarRol(usuarioId: string, rolId: string | null, restauranteId: string | null): Promise<void> {
    // Si se proporciona un rol, verificar que no sea SuperAdministrador
    if (rolId) {
      const rol = await AppDataSource.query(
        `SELECT id, nombre FROM roles WHERE id = @0`,
        [rolId]
      );

      if (rol && rol.length > 0) {
        const nombreRol = rol[0].nombre?.toLowerCase();
        if (nombreRol === 'superadministrador' || nombreRol === 'super administrador') {
          this.handleError(
            'El rol SuperAdministrador no puede ser asignado. Este rol es exclusivo para el dueño del sistema.',
            null,
            403
          );
        }
      }
    }

    // Eliminar roles existentes del usuario para este restaurante
    await AppDataSource.query(`
      DELETE FROM roles_usuario 
      WHERE usuario_id = @0 AND restaurante_id = @1
    `, [usuarioId, restauranteId]);

    // Si se proporciona un rol, asignarlo
    if (rolId) {
      // Verificar que no exista ya esta asignación
      const existe = await AppDataSource.query(`
        SELECT id FROM roles_usuario 
        WHERE usuario_id = @0 AND rol_id = @1 AND restaurante_id = @2
      `, [usuarioId, rolId, restauranteId]);

      if (!existe || existe.length === 0) {
        await AppDataSource.query(`
          INSERT INTO roles_usuario (usuario_id, rol_id, restaurante_id)
          VALUES (@0, @1, @2)
        `, [usuarioId, rolId, restauranteId]);
      }
    }
  }

  /**
   * Elimina un usuario (soft delete)
   */
  async eliminar(
    usuarioId: string,
    usuarioIdEliminador?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar usuario: ${usuarioId}`, { usuarioIdEliminador });

    const usuario = await this.obtenerPorId(usuarioId);
    if (!usuario) {
      this.handleError('Usuario no encontrado', null, 404);
    }

    // Soft delete - marcar fecha_eliminacion
    const fechaActual = getMonteriaLocalDate();
    await AppDataSource.query(`
      UPDATE usuarios
      SET fecha_eliminacion = @0, fecha_actualizacion = @0
      WHERE id = @1
    `, [fechaActual, usuarioId]);

    this.logger.info('Usuario eliminado exitosamente', {
      categoria: this.logCategory,
      restauranteId: usuario!.restauranteId ?? undefined,
      usuarioId: usuarioIdEliminador,
      entidadTipo: 'usuario',
      entidadId: usuarioId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: usuarioId,
        correo: usuario!.correo,
        restauranteId: usuario!.restauranteId,
        nombre: usuario!.nombre,
      },
      metadata: {
        tipoOperacion: 'eliminar_usuario',
        tipoEliminacion: 'soft_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

