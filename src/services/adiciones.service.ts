import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearAdicionDto, ActualizarAdicionDto, QueryAdicionDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';

export interface Adicion {
  id: string;
  restauranteId: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  esObligatorio: boolean;
  maximoSelecciones: number;
  ordenVisualizacion: number;
  activa: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface PaginatedAdiciones {
  items: Adicion[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class AdicionesService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz Adicion
   */
  private mapToAdicion(row: any): Adicion {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      precio: parseFloat(row.precio) || 0,
      esObligatorio: row.es_obligatorio === 1 || row.es_obligatorio === true,
      maximoSelecciones: row.maximo_selecciones || 1,
      ordenVisualizacion: row.orden_visualizacion || 0,
      activa: row.activa === 1 || row.activa === true,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene todas las adiciones con paginación y filtros
   */
  async obtenerTodos(query: QueryAdicionDto): Promise<PaginatedAdiciones> {
    this.logOperation('obtener todas las adiciones', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = [];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`a.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.nombre) {
      condiciones.push(`a.nombre LIKE @${indice}`);
      parametros.push(`%${query.nombre}%`);
      indice++;
    }

    if (query.activa !== undefined) {
      condiciones.push(`a.activa = @${indice}`);
      parametros.push(query.activa ? 1 : 0);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM adiciones a
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener adiciones
    const adiciones = await AppDataSource.query(`
      SELECT 
        a.id, a.restaurante_id, a.nombre, a.descripcion,
        a.precio, a.es_obligatorio, a.maximo_selecciones,
        a.orden_visualizacion, a.activa,
        a.fecha_creacion, a.fecha_actualizacion
      FROM adiciones a
      ${whereClause}
      ORDER BY a.orden_visualizacion ${orden}, a.nombre ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    return {
      items: adiciones.map((a: any) => this.mapToAdicion(a)),
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
   * Obtiene una adición por ID
   */
  async obtenerPorId(adicionId: string): Promise<Adicion | null> {
    this.logOperation(`obtener adición por ID: ${adicionId}`);

    const adiciones = await AppDataSource.query(`
      SELECT 
        a.id, a.restaurante_id, a.nombre, a.descripcion,
        a.precio, a.es_obligatorio, a.maximo_selecciones,
        a.orden_visualizacion, a.activa,
        a.fecha_creacion, a.fecha_actualizacion
      FROM adiciones a
      WHERE a.id = @0
    `, [adicionId]);

    if (!adiciones || adiciones.length === 0) {
      return null;
    }

    return this.mapToAdicion(adiciones[0]);
  }

  /**
   * Obtiene todas las adiciones de un restaurante específico
   */
  async obtenerPorRestauranteId(restauranteId: string): Promise<Adicion[]> {
    this.logOperation(`obtener adiciones por restauranteId: ${restauranteId}`);

    const adiciones = await AppDataSource.query(`
      SELECT 
        a.id, a.restaurante_id, a.nombre, a.descripcion,
        a.precio, a.es_obligatorio, a.maximo_selecciones,
        a.orden_visualizacion, a.activa,
        a.fecha_creacion, a.fecha_actualizacion
      FROM adiciones a
      WHERE a.restaurante_id = @0
      ORDER BY a.orden_visualizacion ASC, a.nombre ASC
    `, [restauranteId]);

    return adiciones.map((a: any) => this.mapToAdicion(a));
  }

  /**
   * Crea una nueva adición
   */
  async crear(
    crearAdicionDto: CrearAdicionDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Adicion> {
    this.logOperation('crear adición', { data: crearAdicionDto, usuarioId });

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearAdicionDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Si no se especifica orden, obtener el siguiente orden disponible
    let ordenVisualizacion = crearAdicionDto.ordenVisualizacion;
    if (ordenVisualizacion === undefined) {
      const maxOrden = await AppDataSource.query(
        `SELECT MAX(orden_visualizacion) as max_orden FROM adiciones WHERE restaurante_id = @0`,
        [crearAdicionDto.restauranteId]
      );
      ordenVisualizacion = (maxOrden[0]?.max_orden || 0) + 1;
    }

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Crear la adición
    const resultado = await AppDataSource.query(`
      INSERT INTO adiciones (
        restaurante_id, nombre, descripcion, precio,
        es_obligatorio, maximo_selecciones, orden_visualizacion,
        activa, fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.nombre,
             INSERTED.descripcion, INSERTED.precio, INSERTED.es_obligatorio,
             INSERTED.maximo_selecciones, INSERTED.orden_visualizacion,
             INSERTED.activa, INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9
      )
    `, [
      crearAdicionDto.restauranteId,
      crearAdicionDto.nombre,
      crearAdicionDto.descripcion || null,
      crearAdicionDto.precio || 0,
      crearAdicionDto.esObligatorio !== undefined ? (crearAdicionDto.esObligatorio ? 1 : 0) : 0,
      crearAdicionDto.maximoSelecciones || 1,
      ordenVisualizacion,
      crearAdicionDto.activa !== undefined ? (crearAdicionDto.activa ? 1 : 0) : 1,
      fechaActual,
      fechaActual,
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear la adición', null, 500);
    }

    const nuevaAdicion = this.mapToAdicion(resultado[0]);

    this.logger.info('Adición creada exitosamente', {
      categoria: this.logCategory,
      restauranteId: nuevaAdicion.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'adicion',
      entidadId: nuevaAdicion.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: nuevaAdicion.id,
        restauranteId: nuevaAdicion.restauranteId,
        nombre: nuevaAdicion.nombre,
        precio: nuevaAdicion.precio,
        esObligatorio: nuevaAdicion.esObligatorio,
        maximoSelecciones: nuevaAdicion.maximoSelecciones,
        activa: nuevaAdicion.activa,
      },
      metadata: {
        tipoOperacion: 'crear_adicion',
        camposProporcionados: Object.keys(crearAdicionDto),
        timestamp: new Date().toISOString(),
      },
    });

    return nuevaAdicion;
  }

  /**
   * Actualiza una adición
   */
  async actualizar(
    adicionId: string,
    actualizarAdicionDto: ActualizarAdicionDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Adicion> {
    this.logOperation(`actualizar adición: ${adicionId}`, { data: actualizarAdicionDto, usuarioId });

    const adicion = await this.obtenerPorId(adicionId);
    if (!adicion) {
      this.handleError('Adición no encontrada', null, 404);
    }

    // Construir campos a actualizar
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarAdicionDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarAdicionDto.nombre);
      indice++;
    }

    if (actualizarAdicionDto.descripcion !== undefined) {
      campos.push(`descripcion = @${indice}`);
      valores.push(actualizarAdicionDto.descripcion || null);
      indice++;
    }

    if (actualizarAdicionDto.precio !== undefined) {
      campos.push(`precio = @${indice}`);
      valores.push(actualizarAdicionDto.precio);
      indice++;
    }

    if (actualizarAdicionDto.esObligatorio !== undefined) {
      campos.push(`es_obligatorio = @${indice}`);
      valores.push(actualizarAdicionDto.esObligatorio ? 1 : 0);
      indice++;
    }

    if (actualizarAdicionDto.maximoSelecciones !== undefined) {
      campos.push(`maximo_selecciones = @${indice}`);
      valores.push(actualizarAdicionDto.maximoSelecciones);
      indice++;
    }

    if (actualizarAdicionDto.ordenVisualizacion !== undefined) {
      campos.push(`orden_visualizacion = @${indice}`);
      valores.push(actualizarAdicionDto.ordenVisualizacion);
      indice++;
    }

    if (actualizarAdicionDto.activa !== undefined) {
      campos.push(`activa = @${indice}`);
      valores.push(actualizarAdicionDto.activa ? 1 : 0);
      indice++;
    }

    // Siempre actualizar fecha_actualizacion
    const fechaActual = getMonteriaLocalDate();
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    indice++;

    if (campos.length === 1) {
      // Solo se actualiza fecha_actualizacion, no hay otros campos
      await AppDataSource.query(
        `UPDATE adiciones SET fecha_actualizacion = @0 WHERE id = @1`,
        [fechaActual, adicionId]
      );
    } else {
      valores.push(adicionId);
      await AppDataSource.query(
        `UPDATE adiciones SET ${campos.join(', ')} WHERE id = @${indice}`,
        valores
      );
    }

    // Obtener adición actualizada
    const adicionActualizada = await this.obtenerPorId(adicionId);
    if (!adicionActualizada) {
      this.handleError('Error al obtener la adición actualizada', null, 500);
    }

    this.logger.info('Adición actualizada exitosamente', {
      categoria: this.logCategory,
      restauranteId: adicion!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'adicion',
      entidadId: adicionId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: adicionId,
        restauranteId: adicion!.restauranteId,
        nombre: adicionActualizada.nombre,
        precio: adicionActualizada.precio,
        esObligatorio: adicionActualizada.esObligatorio,
        maximoSelecciones: adicionActualizada.maximoSelecciones,
        activa: adicionActualizada.activa,
      },
      metadata: {
        tipoOperacion: 'actualizar_adicion',
        camposActualizados: Object.keys(actualizarAdicionDto),
        timestamp: new Date().toISOString(),
      },
    });

    return adicionActualizada!;
  }

  /**
   * Elimina una adición
   */
  async eliminar(
    adicionId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar adición: ${adicionId}`, { usuarioId });

    const adicion = await this.obtenerPorId(adicionId);
    if (!adicion) {
      this.handleError('Adición no encontrada', null, 404);
    }

    // Verificar que no esté siendo usada en items del menú
    const itemsConAdicion = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM items_menu_adiciones ima
      INNER JOIN items_menu im ON ima.item_menu_id = im.id
      WHERE ima.adicion_id = @0 
        AND im.fecha_eliminacion IS NULL
    `, [adicionId]);

    if (itemsConAdicion && itemsConAdicion[0] && itemsConAdicion[0].total > 0) {
      this.handleError(
        `No se puede eliminar la adición porque está siendo usada en ${itemsConAdicion[0].total} item(s) del menú`,
        null,
        400
      );
    }

    await AppDataSource.query(`DELETE FROM adiciones WHERE id = @0`, [adicionId]);

    this.logger.info('Adición eliminada exitosamente', {
      categoria: this.logCategory,
      restauranteId: adicion!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'adicion',
      entidadId: adicionId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: adicionId,
        restauranteId: adicion!.restauranteId,
        nombre: adicion!.nombre,
      },
      metadata: {
        tipoOperacion: 'eliminar_adicion',
        tipoEliminacion: 'hard_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

