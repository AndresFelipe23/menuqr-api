import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearComentarioDto, ActualizarComentarioDto, QueryComentarioDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';

export interface Comentario {
  id: string;
  restauranteId: string | null;
  usuarioId: string | null;
  tipo: 'comentario' | 'queja' | 'solicitud' | 'sugerencia' | 'pregunta';
  asunto: string;
  mensaje: string;
  estado: 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';
  respuesta: string | null;
  usuarioRespuestaId: string | null;
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente';
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaRespuesta: Date | null;
  fechaEliminacion: Date | null;
}

export interface ComentarioConUsuario extends Comentario {
  nombreUsuario?: string;
  correoUsuario?: string;
  nombreRestaurante?: string;
  nombreUsuarioRespuesta?: string;
}

export interface PaginatedComentarios {
  items: ComentarioConUsuario[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ComentariosService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz Comentario
   */
  private mapToComentario(row: any): ComentarioConUsuario {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      usuarioId: row.usuario_id,
      tipo: row.tipo,
      asunto: row.asunto,
      mensaje: row.mensaje,
      estado: row.estado,
      respuesta: row.respuesta,
      usuarioRespuestaId: row.usuario_respuesta_id,
      prioridad: row.prioridad || 'normal',
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
      fechaRespuesta: row.fecha_respuesta,
      fechaEliminacion: row.fecha_eliminacion,
      nombreUsuario: row.nombre_usuario,
      correoUsuario: row.correo_usuario,
      nombreRestaurante: row.nombre_restaurante,
      nombreUsuarioRespuesta: row.nombre_usuario_respuesta,
    };
  }

  /**
   * Obtiene todos los comentarios con paginación y filtros
   */
  async obtenerTodos(query: QueryComentarioDto): Promise<PaginatedComentarios> {
    this.logOperation('obtener todos los comentarios', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = ['c.fecha_eliminacion IS NULL'];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      // Convertir a string y limpiar espacios en blanco por si acaso
      const restauranteId = String(query.restauranteId).trim();
      condiciones.push(`c.restaurante_id = @${indice}`);
      parametros.push(restauranteId);
      indice++;
      
      this.logger.info('Filtrando por restauranteId', {
        categoria: this.logCategory,
        restauranteId: restauranteId,
        detalle: { parametros },
      });
    }

    if (query.usuarioId) {
      condiciones.push(`c.usuario_id = @${indice}`);
      parametros.push(query.usuarioId);
      indice++;
    }

    if (query.tipo) {
      condiciones.push(`c.tipo = @${indice}`);
      parametros.push(query.tipo);
      indice++;
    }

    if (query.estado) {
      condiciones.push(`c.estado = @${indice}`);
      parametros.push(query.estado);
      indice++;
    }

    if (query.prioridad) {
      condiciones.push(`c.prioridad = @${indice}`);
      parametros.push(query.prioridad);
      indice++;
    }

    if (query.asunto) {
      condiciones.push(`c.asunto LIKE @${indice}`);
      parametros.push(`%${query.asunto}%`);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Orden por defecto
    const orden = query.orden || 'desc';
    const orderBy = `ORDER BY c.fecha_creacion ${orden.toUpperCase()}`;

    // Contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comentarios c
      ${whereClause}
    `;
    const countResult = await AppDataSource.query(countQuery, parametros);
    const total = countResult[0]?.total || 0;

    // Obtener comentarios con información de usuario y restaurante
    const selectQuery = `
      SELECT 
        c.id,
        c.restaurante_id,
        c.usuario_id,
        c.tipo,
        c.asunto,
        c.mensaje,
        c.estado,
        c.respuesta,
        c.usuario_respuesta_id,
        c.prioridad,
        c.fecha_creacion,
        c.fecha_actualizacion,
        c.fecha_respuesta,
        c.fecha_eliminacion,
        u.nombre + ' ' + u.apellido AS nombre_usuario,
        u.correo AS correo_usuario,
        r.nombre AS nombre_restaurante,
        ur.nombre + ' ' + ur.apellido AS nombre_usuario_respuesta
      FROM comentarios c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN restaurantes r ON c.restaurante_id = r.id
      LEFT JOIN usuarios ur ON c.usuario_respuesta_id = ur.id
      ${whereClause}
      ${orderBy}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `;
    parametros.push(offset, limit);

    this.logger.info('Ejecutando consulta de comentarios', {
      categoria: this.logCategory,
      detalle: {
        whereClause,
        parametrosCount: parametros.length,
        page,
        limit,
        offset,
        selectQuery: selectQuery.substring(0, 200) + '...',
      },
    });

    const resultados = await AppDataSource.query(selectQuery, parametros);
    
    this.logger.info('Resultados de consulta de comentarios', {
      categoria: this.logCategory,
      detalle: {
        totalResultados: resultados.length,
        totalRegistros: total,
        primerosResultados: resultados.slice(0, 2).map((r: any) => ({
          id: r.id,
          restaurante_id: r.restaurante_id,
          usuario_id: r.usuario_id,
          asunto: r.asunto,
          estado: r.estado,
        })),
      },
    });
    
    const items = resultados.map((row: any) => this.mapToComentario(row));

    const totalPages = Math.ceil(total / limit);

    return {
      items,
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
   * Obtiene un comentario por ID
   */
  async obtenerPorId(id: string): Promise<ComentarioConUsuario | null> {
    this.logOperation('obtener comentario por ID', { id });

    const query = `
      SELECT 
        c.id,
        c.restaurante_id,
        c.usuario_id,
        c.tipo,
        c.asunto,
        c.mensaje,
        c.estado,
        c.respuesta,
        c.usuario_respuesta_id,
        c.prioridad,
        c.fecha_creacion,
        c.fecha_actualizacion,
        c.fecha_respuesta,
        c.fecha_eliminacion,
        u.nombre + ' ' + u.apellido AS nombre_usuario,
        u.correo AS correo_usuario,
        r.nombre AS nombre_restaurante,
        ur.nombre + ' ' + ur.apellido AS nombre_usuario_respuesta
      FROM comentarios c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN restaurantes r ON c.restaurante_id = r.id
      LEFT JOIN usuarios ur ON c.usuario_respuesta_id = ur.id
      WHERE c.id = @0 AND c.fecha_eliminacion IS NULL
    `;

    const resultados = await AppDataSource.query(query, [id]);

    if (resultados.length === 0) {
      return null;
    }

    return this.mapToComentario(resultados[0]);
  }

  /**
   * Crea un nuevo comentario
   */
  async crear(
    crearComentarioDto: CrearComentarioDto,
    usuarioId?: string,
    requestInfo?: any
  ): Promise<Comentario> {
    this.logOperation('crear comentario', { crearComentarioDto, usuarioId });

    const id = crypto.randomUUID();
    const fechaActual = getMonteriaLocalDate();
    const prioridad = crearComentarioDto.prioridad || 'normal';

    // Si se proporciona usuarioId en el DTO, usarlo; si no, usar el del request
    const finalUsuarioId = crearComentarioDto.usuarioId || usuarioId || null;

    const query = `
      INSERT INTO comentarios (
        id, restaurante_id, usuario_id, tipo, asunto, mensaje, estado, prioridad,
        fecha_creacion, fecha_actualizacion
      )
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9
      )
    `;

    await AppDataSource.query(query, [
      id,
      crearComentarioDto.restauranteId || null,
      finalUsuarioId,
      crearComentarioDto.tipo,
      crearComentarioDto.asunto,
      crearComentarioDto.mensaje,
      'pendiente',
      prioridad,
      fechaActual,
      fechaActual,
    ]);

    this.logger.info('Comentario creado exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'comentario',
      entidadId: id,
      restauranteId: crearComentarioDto.restauranteId || undefined,
      usuarioId: finalUsuarioId || undefined,
      detalle: {
        tipo: crearComentarioDto.tipo,
        requestInfo,
      },
    });

    const comentario = await this.obtenerPorId(id);
    if (!comentario) {
      this.handleError('Error al obtener el comentario creado', null, 500);
    }

    return comentario as Comentario;
  }

  /**
   * Actualiza un comentario
   */
  async actualizar(
    id: string,
    actualizarComentarioDto: ActualizarComentarioDto,
    usuarioId?: string,
    requestInfo?: any
  ): Promise<Comentario> {
    this.logOperation('actualizar comentario', { id, actualizarComentarioDto });

    // Verificar que el comentario existe
    const comentarioExistente = await this.obtenerPorId(id);
    if (!comentarioExistente) {
      this.handleError('Comentario no encontrado', null, 404);
    }

    const fechaActual = getMonteriaLocalDate();
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarComentarioDto.tipo !== undefined) {
      campos.push(`tipo = @${indice}`);
      valores.push(actualizarComentarioDto.tipo);
      indice++;
    }

    if (actualizarComentarioDto.asunto !== undefined) {
      campos.push(`asunto = @${indice}`);
      valores.push(actualizarComentarioDto.asunto);
      indice++;
    }

    if (actualizarComentarioDto.mensaje !== undefined) {
      campos.push(`mensaje = @${indice}`);
      valores.push(actualizarComentarioDto.mensaje);
      indice++;
    }

    if (actualizarComentarioDto.estado !== undefined) {
      campos.push(`estado = @${indice}`);
      valores.push(actualizarComentarioDto.estado);
      indice++;
    }

    if (actualizarComentarioDto.respuesta !== undefined) {
      campos.push(`respuesta = @${indice}`);
      campos.push(`usuario_respuesta_id = @${indice + 1}`);
      campos.push(`fecha_respuesta = @${indice + 2}`);
      valores.push(actualizarComentarioDto.respuesta);
      valores.push(usuarioId || null);
      valores.push(fechaActual);
      indice += 3;
    }

    if (actualizarComentarioDto.prioridad !== undefined) {
      campos.push(`prioridad = @${indice}`);
      valores.push(actualizarComentarioDto.prioridad);
      indice++;
    }

    if (campos.length === 0) {
      this.handleError('No se proporcionaron campos para actualizar', null, 400);
    }

    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    valores.push(id); // Para el WHERE

    const query = `
      UPDATE comentarios
      SET ${campos.join(', ')}
      WHERE id = @${indice + 1} AND fecha_eliminacion IS NULL
    `;

    await AppDataSource.query(query, valores);

    this.logger.info('Comentario actualizado exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'comentario',
      entidadId: id,
      usuarioId: usuarioId || undefined,
      detalle: {
        cambios: actualizarComentarioDto,
        requestInfo,
      },
    });

    const comentario = await this.obtenerPorId(id);
    if (!comentario) {
      this.handleError('Error al obtener el comentario actualizado', null, 500);
    }

    return comentario as Comentario;
  }

  /**
   * Elimina un comentario (soft delete)
   */
  async eliminar(id: string, usuarioId?: string, requestInfo?: any): Promise<void> {
    this.logOperation('eliminar comentario', { id });

    const comentarioExistente = await this.obtenerPorId(id);
    if (!comentarioExistente) {
      this.handleError('Comentario no encontrado', null, 404);
    }

    const fechaActual = getMonteriaLocalDate();
    const query = `
      UPDATE comentarios
      SET fecha_eliminacion = @0, fecha_actualizacion = @1
      WHERE id = @2 AND fecha_eliminacion IS NULL
    `;

    await AppDataSource.query(query, [fechaActual, fechaActual, id]);

    this.logger.info('Comentario eliminado exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'comentario',
      entidadId: id,
      usuarioId: usuarioId || undefined,
      detalle: {
        requestInfo,
      },
    });
  }

  /**
   * Responde a un comentario
   */
  async responder(
    id: string,
    respuesta: string,
    usuarioId: string,
    requestInfo?: any
  ): Promise<Comentario> {
    this.logOperation('responder comentario', { id, usuarioId });

    const comentarioExistente = await this.obtenerPorId(id);
    if (!comentarioExistente) {
      this.handleError('Comentario no encontrado', null, 404);
    }

    const fechaActual = getMonteriaLocalDate();
    const query = `
      UPDATE comentarios
      SET 
        respuesta = @0,
        usuario_respuesta_id = @1,
        fecha_respuesta = @2,
        estado = CASE 
          WHEN estado = 'pendiente' THEN 'en_proceso'
          ELSE estado
        END,
        fecha_actualizacion = @3
      WHERE id = @4 AND fecha_eliminacion IS NULL
    `;

    await AppDataSource.query(query, [respuesta, usuarioId, fechaActual, fechaActual, id]);

    this.logger.info('Respuesta agregada al comentario exitosamente', {
      categoria: this.logCategory,
      entidadTipo: 'comentario',
      entidadId: id,
      usuarioId: usuarioId || undefined,
      detalle: {
        requestInfo,
      },
    });

    const comentario = await this.obtenerPorId(id);
    if (!comentario) {
      this.handleError('Error al obtener el comentario actualizado', null, 500);
    }

    return comentario as Comentario;
  }
}

