import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearEnlaceDto, ActualizarEnlaceDto, QueryEnlaceDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { SuscripcionesService } from './suscripciones.service';

export interface EnlaceRestaurante {
  id: string;
  restauranteId: string;
  titulo: string;
  url: string;
  iconoUrl: string | null;
  tipoIcono: string | null;
  ordenVisualizacion: number;
  activo: boolean;
  contadorClics: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface PaginatedEnlaces {
  items: EnlaceRestaurante[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class EnlacesService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz EnlaceRestaurante
   */
  private mapToEnlace(row: any): EnlaceRestaurante {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      titulo: row.titulo,
      url: row.url,
      iconoUrl: row.icono_url,
      tipoIcono: row.tipo_icono,
      ordenVisualizacion: row.orden_visualizacion || 0,
      activo: row.activo === 1 || row.activo === true,
      contadorClics: row.contador_clics || 0,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene todos los enlaces con paginación y filtros
   */
  async obtenerTodos(query: QueryEnlaceDto): Promise<PaginatedEnlaces> {
    this.logOperation('obtener todos los enlaces', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = [];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`er.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.titulo) {
      condiciones.push(`er.titulo LIKE @${indice}`);
      parametros.push(`%${query.titulo}%`);
      indice++;
    }

    if (query.tipoIcono) {
      condiciones.push(`er.tipo_icono = @${indice}`);
      parametros.push(query.tipoIcono);
      indice++;
    }

    if (query.activo !== undefined) {
      condiciones.push(`er.activo = @${indice}`);
      parametros.push(query.activo ? 1 : 0);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM enlaces_restaurante er
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener enlaces
    const enlaces = await AppDataSource.query(`
      SELECT 
        er.id, er.restaurante_id, er.titulo, er.url,
        er.icono_url, er.tipo_icono, er.orden_visualizacion,
        er.activo, er.contador_clics,
        er.fecha_creacion, er.fecha_actualizacion
      FROM enlaces_restaurante er
      ${whereClause}
      ORDER BY er.orden_visualizacion ${orden}, er.fecha_creacion ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    return {
      items: enlaces.map((e: any) => this.mapToEnlace(e)),
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
   * Obtiene un enlace por ID
   */
  async obtenerPorId(enlaceId: string): Promise<EnlaceRestaurante | null> {
    this.logOperation(`obtener enlace por ID: ${enlaceId}`);

    const enlaces = await AppDataSource.query(`
      SELECT 
        er.id, er.restaurante_id, er.titulo, er.url,
        er.icono_url, er.tipo_icono, er.orden_visualizacion,
        er.activo, er.contador_clics,
        er.fecha_creacion, er.fecha_actualizacion
      FROM enlaces_restaurante er
      WHERE er.id = @0
    `, [enlaceId]);

    if (!enlaces || enlaces.length === 0) {
      return null;
    }

    return this.mapToEnlace(enlaces[0]);
  }

  /**
   * Obtiene todos los enlaces de un restaurante específico
   * @param restauranteId - ID del restaurante
   * @param soloActivos - Si es true, solo devuelve enlaces activos (para rutas públicas)
   */
  async obtenerPorRestauranteId(restauranteId: string, soloActivos: boolean = false): Promise<EnlaceRestaurante[]> {
    this.logOperation(`obtener enlaces por restauranteId: ${restauranteId}`, { soloActivos });

    let query = `
      SELECT 
        er.id, er.restaurante_id, er.titulo, er.url,
        er.icono_url, er.tipo_icono, er.orden_visualizacion,
        er.activo, er.contador_clics,
        er.fecha_creacion, er.fecha_actualizacion
      FROM enlaces_restaurante er
      WHERE er.restaurante_id = @0
    `;
    
    const params: any[] = [restauranteId];
    
    if (soloActivos) {
      query += ' AND er.activo = 1';
    }
    
    query += ' ORDER BY er.orden_visualizacion ASC, er.fecha_creacion ASC';

    const enlaces = await AppDataSource.query(query, params);

    return enlaces.map((e: any) => this.mapToEnlace(e));
  }

  /**
   * Crea un nuevo enlace
   */
  async crear(
    crearEnlaceDto: CrearEnlaceDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<EnlaceRestaurante> {
    this.logOperation('crear enlace', { data: crearEnlaceDto, usuarioId });

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearEnlaceDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar límites de suscripción para enlaces
    try {
      const suscripcionesService = new SuscripcionesService();
      const limites = await suscripcionesService.verificarLimites(crearEnlaceDto.restauranteId, 'enlaces');
      
      if (!limites.permitido) {
        const mensaje = limites.limite === -1 
          ? 'No se puede crear más enlaces. Por favor, actualiza tu plan para obtener límites ilimitados.'
          : `Has alcanzado el límite de ${limites.limite} enlace(s) de tu plan actual (${limites.actual}/${limites.limite}). ` +
            'Por favor, actualiza tu plan a PRO o PREMIUM para crear más enlaces.';
        this.handleError(mensaje, null, 403);
      }
    } catch (error: any) {
      // Si hay error al verificar límites, continuar (no bloquear)
      this.logger.warn('Error al verificar límites de suscripción para enlaces', {
        categoria: this.logCategory,
        restauranteId: crearEnlaceDto.restauranteId,
        detalle: { error: error.message },
      });
    }

    // Si no se especifica orden, obtener el siguiente orden disponible
    let ordenVisualizacion = crearEnlaceDto.ordenVisualizacion;
    if (ordenVisualizacion === undefined) {
      const maxOrden = await AppDataSource.query(
        `SELECT MAX(orden_visualizacion) as max_orden FROM enlaces_restaurante WHERE restaurante_id = @0`,
        [crearEnlaceDto.restauranteId]
      );
      ordenVisualizacion = (maxOrden[0]?.max_orden || 0) + 1;
    }

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Crear el enlace
    const resultado = await AppDataSource.query(`
      INSERT INTO enlaces_restaurante (
        restaurante_id, titulo, url, icono_url, tipo_icono,
        orden_visualizacion, activo, contador_clics,
        fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.titulo, INSERTED.url,
        INSERTED.icono_url, INSERTED.tipo_icono, INSERTED.orden_visualizacion,
        INSERTED.activo, INSERTED.contador_clics,
        INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @8
      )
    `, [
      crearEnlaceDto.restauranteId,
      crearEnlaceDto.titulo,
      crearEnlaceDto.url,
      crearEnlaceDto.iconoUrl || null,
      crearEnlaceDto.tipoIcono || null,
      ordenVisualizacion,
      crearEnlaceDto.activo !== undefined ? (crearEnlaceDto.activo ? 1 : 0) : 1,
      0, // contador_clics inicial en 0
      fechaActual, // fecha_creacion en hora local de Montería
      fechaActual, // fecha_actualizacion en hora local de Montería
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear el enlace', null, 500);
    }

    const nuevoEnlace = resultado[0];
    const enlaceMapeado = this.mapToEnlace(nuevoEnlace);

    this.logger.info('Enlace creado exitosamente', {
      categoria: this.logCategory,
      restauranteId: crearEnlaceDto.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'enlace_restaurante',
      entidadId: enlaceMapeado.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: enlaceMapeado.id,
        restauranteId: enlaceMapeado.restauranteId,
        titulo: enlaceMapeado.titulo,
        url: enlaceMapeado.url,
        tipoIcono: enlaceMapeado.tipoIcono,
        ordenVisualizacion: enlaceMapeado.ordenVisualizacion,
        activo: enlaceMapeado.activo,
      },
      metadata: {
        tipoOperacion: 'crear_enlace',
        camposProporcionados: Object.keys(crearEnlaceDto),
        timestamp: new Date().toISOString(),
      },
    });

    return enlaceMapeado;
  }

  /**
   * Actualiza un enlace
   */
  async actualizar(
    enlaceId: string,
    actualizarEnlaceDto: ActualizarEnlaceDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<EnlaceRestaurante> {
    this.logOperation(`actualizar enlace: ${enlaceId}`, { data: actualizarEnlaceDto, usuarioId });

    const enlace = await this.obtenerPorId(enlaceId);
    if (!enlace) {
      this.handleError('Enlace no encontrado', null, 404);
    }

    // Construir la consulta UPDATE dinámicamente
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarEnlaceDto.titulo !== undefined) {
      campos.push(`titulo = @${indice}`);
      valores.push(actualizarEnlaceDto.titulo);
      indice++;
    }

    if (actualizarEnlaceDto.url !== undefined) {
      campos.push(`url = @${indice}`);
      valores.push(actualizarEnlaceDto.url);
      indice++;
    }

    if (actualizarEnlaceDto.iconoUrl !== undefined) {
      campos.push(`icono_url = @${indice}`);
      valores.push(actualizarEnlaceDto.iconoUrl);
      indice++;
    }

    if (actualizarEnlaceDto.tipoIcono !== undefined) {
      campos.push(`tipo_icono = @${indice}`);
      valores.push(actualizarEnlaceDto.tipoIcono);
      indice++;
    }

    if (actualizarEnlaceDto.ordenVisualizacion !== undefined) {
      campos.push(`orden_visualizacion = @${indice}`);
      valores.push(actualizarEnlaceDto.ordenVisualizacion);
      indice++;
    }

    if (actualizarEnlaceDto.activo !== undefined) {
      campos.push(`activo = @${indice}`);
      valores.push(actualizarEnlaceDto.activo ? 1 : 0);
      indice++;
    }

    if (campos.length === 0) {
      return enlace!;
    }

    // Agregar fecha_actualizacion en hora local de Montería
    const fechaActual = getMonteriaLocalDate();
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    indice++;

    valores.push(enlaceId);

    await AppDataSource.query(`
      UPDATE enlaces_restaurante
      SET ${campos.join(', ')}
      WHERE id = @${indice}
    `, valores);

    const enlaceActualizado = await this.obtenerPorId(enlaceId) as EnlaceRestaurante;

    // Preparar información de cambios
    const camposActualizados = Object.keys(actualizarEnlaceDto).filter(
      key => actualizarEnlaceDto[key as keyof ActualizarEnlaceDto] !== undefined
    );

    this.logger.info('Enlace actualizado exitosamente', {
      categoria: this.logCategory,
      restauranteId: enlaceActualizado.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'enlace_restaurante',
      entidadId: enlaceId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: enlaceActualizado.id,
        restauranteId: enlaceActualizado.restauranteId,
        titulo: enlaceActualizado.titulo,
        url: enlaceActualizado.url,
        camposActualizados: camposActualizados,
        valoresAnteriores: enlace ? {
          titulo: enlace.titulo,
          url: enlace.url,
          tipoIcono: enlace.tipoIcono,
          ordenVisualizacion: enlace.ordenVisualizacion,
          activo: enlace.activo,
        } : null,
        valoresNuevos: actualizarEnlaceDto,
      },
      metadata: {
        tipoOperacion: 'actualizar_enlace',
        camposModificados: camposActualizados,
        cantidadCamposModificados: camposActualizados.length,
        timestamp: new Date().toISOString(),
      },
    });

    return enlaceActualizado;
  }

  /**
   * Incrementa el contador de clics de un enlace
   */
  async incrementarClics(
    enlaceId: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    const enlace = await this.obtenerPorId(enlaceId);
    if (!enlace) {
      this.handleError('Enlace no encontrado', null, 404);
    }

    await AppDataSource.query(`
      UPDATE enlaces_restaurante
      SET contador_clics = contador_clics + 1
      WHERE id = @0
    `, [enlaceId]);

    this.logger.info('Contador de clics incrementado', {
      categoria: this.logCategory,
      restauranteId: enlace!.restauranteId,
      entidadTipo: 'enlace_restaurante',
      entidadId: enlaceId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: enlaceId,
        titulo: enlace!.titulo,
        url: enlace!.url,
        clicsAnteriores: enlace!.contadorClics,
        clicsNuevos: enlace!.contadorClics + 1,
      },
      metadata: {
        tipoOperacion: 'incrementar_clics',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Elimina un enlace
   */
  async eliminar(
    enlaceId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar enlace: ${enlaceId}`, { usuarioId });

    const enlace = await this.obtenerPorId(enlaceId);
    if (!enlace) {
      this.handleError('Enlace no encontrado', null, 404);
    }

    await AppDataSource.query(`DELETE FROM enlaces_restaurante WHERE id = @0`, [enlaceId]);

    this.logger.info('Enlace eliminado exitosamente', {
      categoria: this.logCategory,
      restauranteId: enlace!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'enlace_restaurante',
      entidadId: enlaceId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: enlaceId,
        restauranteId: enlace!.restauranteId,
        titulo: enlace!.titulo,
        url: enlace!.url,
        tipoIcono: enlace!.tipoIcono,
        ordenVisualizacion: enlace!.ordenVisualizacion,
        contadorClics: enlace!.contadorClics,
      },
      metadata: {
        tipoOperacion: 'eliminar_enlace',
        tipoEliminacion: 'hard_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

