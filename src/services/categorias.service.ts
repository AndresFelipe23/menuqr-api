import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearCategoriaDto, ActualizarCategoriaDto, QueryCategoriaDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';

export interface Categoria {
  id: string;
  restauranteId: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  ordenVisualizacion: number;
  activa: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface PaginatedCategorias {
  items: Categoria[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class CategoriasService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz Categoria
   */
  private mapToCategoria(row: any): Categoria {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      imagenUrl: row.imagen_url,
      ordenVisualizacion: row.orden_visualizacion || 0,
      activa: row.activa === 1 || row.activa === true,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene todas las categorías con paginación y filtros
   */
  async obtenerTodos(query: QueryCategoriaDto): Promise<PaginatedCategorias> {
    this.logOperation('obtener todas las categorías', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = [];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`c.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.nombre) {
      condiciones.push(`c.nombre LIKE @${indice}`);
      parametros.push(`%${query.nombre}%`);
      indice++;
    }

    if (query.activa !== undefined) {
      condiciones.push(`c.activa = @${indice}`);
      parametros.push(query.activa ? 1 : 0);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM categorias c
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener categorías
    const categorias = await AppDataSource.query(`
      SELECT 
        c.id, c.restaurante_id, c.nombre, c.descripcion,
        c.imagen_url, c.orden_visualizacion, c.activa,
        c.fecha_creacion, c.fecha_actualizacion
      FROM categorias c
      ${whereClause}
      ORDER BY c.orden_visualizacion ${orden}, c.nombre ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    return {
      items: categorias.map((c: any) => this.mapToCategoria(c)),
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
   * Obtiene una categoría por ID
   */
  async obtenerPorId(categoriaId: string): Promise<Categoria | null> {
    this.logOperation(`obtener categoría por ID: ${categoriaId}`);

    const categorias = await AppDataSource.query(`
      SELECT 
        c.id, c.restaurante_id, c.nombre, c.descripcion,
        c.imagen_url, c.orden_visualizacion, c.activa,
        c.fecha_creacion, c.fecha_actualizacion
      FROM categorias c
      WHERE c.id = @0
    `, [categoriaId]);

    if (!categorias || categorias.length === 0) {
      return null;
    }

    return this.mapToCategoria(categorias[0]);
  }

  /**
   * Obtiene todas las categorías de un restaurante específico
   * @param restauranteId - ID del restaurante
   * @param soloActivas - Si es true, solo devuelve categorías activas (para rutas públicas)
   */
  async obtenerPorRestauranteId(restauranteId: string, soloActivas: boolean = false): Promise<Categoria[]> {
    this.logOperation(`obtener categorías por restauranteId: ${restauranteId}`, { soloActivas });

    let query = `
      SELECT 
        c.id, c.restaurante_id, c.nombre, c.descripcion,
        c.imagen_url, c.orden_visualizacion, c.activa,
        c.fecha_creacion, c.fecha_actualizacion
      FROM categorias c
      WHERE c.restaurante_id = @0
    `;
    
    if (soloActivas) {
      query += ' AND c.activa = 1';
    }
    
    query += ' ORDER BY c.orden_visualizacion ASC, c.nombre ASC';

    const categorias = await AppDataSource.query(query, [restauranteId]);

    return categorias.map((c: any) => this.mapToCategoria(c));
  }

  /**
   * Crea una nueva categoría
   */
  async crear(
    crearCategoriaDto: CrearCategoriaDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Categoria> {
    this.logOperation('crear categoría', { data: crearCategoriaDto, usuarioId });

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearCategoriaDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Si no se especifica orden, obtener el siguiente orden disponible
    let ordenVisualizacion = crearCategoriaDto.ordenVisualizacion;
    if (ordenVisualizacion === undefined) {
      const maxOrden = await AppDataSource.query(
        `SELECT MAX(orden_visualizacion) as max_orden FROM categorias WHERE restaurante_id = @0`,
        [crearCategoriaDto.restauranteId]
      );
      ordenVisualizacion = (maxOrden[0]?.max_orden || 0) + 1;
    }

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Crear la categoría
    const resultado = await AppDataSource.query(`
      INSERT INTO categorias (
        restaurante_id, nombre, descripcion, imagen_url,
        orden_visualizacion, activa,
        fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.nombre, INSERTED.descripcion,
        INSERTED.imagen_url, INSERTED.orden_visualizacion, INSERTED.activa,
        INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @6
      )
    `, [
      crearCategoriaDto.restauranteId,
      crearCategoriaDto.nombre,
      crearCategoriaDto.descripcion || null,
      crearCategoriaDto.imagenUrl || null,
      ordenVisualizacion,
      crearCategoriaDto.activa !== undefined ? (crearCategoriaDto.activa ? 1 : 0) : 1,
      fechaActual, // fecha_creacion en hora local de Montería
      fechaActual, // fecha_actualizacion en hora local de Montería
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear la categoría', null, 500);
    }

    const nuevaCategoria = resultado[0];
    const categoriaMapeada = this.mapToCategoria(nuevaCategoria);

    this.logger.info('Categoría creada exitosamente', {
      categoria: this.logCategory,
      restauranteId: crearCategoriaDto.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'categoria',
      entidadId: categoriaMapeada.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: categoriaMapeada.id,
        restauranteId: categoriaMapeada.restauranteId,
        nombre: categoriaMapeada.nombre,
        ordenVisualizacion: categoriaMapeada.ordenVisualizacion,
        activa: categoriaMapeada.activa,
      },
      metadata: {
        tipoOperacion: 'crear_categoria',
        camposProporcionados: Object.keys(crearCategoriaDto),
        timestamp: new Date().toISOString(),
      },
    });

    return categoriaMapeada;
  }

  /**
   * Actualiza una categoría
   */
  async actualizar(
    categoriaId: string,
    actualizarCategoriaDto: ActualizarCategoriaDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Categoria> {
    this.logOperation(`actualizar categoría: ${categoriaId}`, { data: actualizarCategoriaDto, usuarioId });

    const categoria = await this.obtenerPorId(categoriaId);
    if (!categoria) {
      this.handleError('Categoría no encontrada', null, 404);
    }

    // Construir la consulta UPDATE dinámicamente
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarCategoriaDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarCategoriaDto.nombre);
      indice++;
    }

    if (actualizarCategoriaDto.descripcion !== undefined) {
      campos.push(`descripcion = @${indice}`);
      valores.push(actualizarCategoriaDto.descripcion);
      indice++;
    }

    if (actualizarCategoriaDto.imagenUrl !== undefined) {
      campos.push(`imagen_url = @${indice}`);
      valores.push(actualizarCategoriaDto.imagenUrl);
      indice++;
    }

    if (actualizarCategoriaDto.ordenVisualizacion !== undefined) {
      campos.push(`orden_visualizacion = @${indice}`);
      valores.push(actualizarCategoriaDto.ordenVisualizacion);
      indice++;
    }

    if (actualizarCategoriaDto.activa !== undefined) {
      campos.push(`activa = @${indice}`);
      valores.push(actualizarCategoriaDto.activa ? 1 : 0);
      indice++;
    }

    if (campos.length === 0) {
      return categoria!;
    }

    // Agregar fecha_actualizacion en hora local de Montería
    const fechaActual = getMonteriaLocalDate();
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    indice++;

    valores.push(categoriaId);

    await AppDataSource.query(`
      UPDATE categorias
      SET ${campos.join(', ')}
      WHERE id = @${indice}
    `, valores);

    const categoriaActualizada = await this.obtenerPorId(categoriaId) as Categoria;

    // Preparar información de cambios
    const camposActualizados = Object.keys(actualizarCategoriaDto).filter(
      key => actualizarCategoriaDto[key as keyof ActualizarCategoriaDto] !== undefined
    );

    this.logger.info('Categoría actualizada exitosamente', {
      categoria: this.logCategory,
      restauranteId: categoriaActualizada.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'categoria',
      entidadId: categoriaId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: categoriaActualizada.id,
        restauranteId: categoriaActualizada.restauranteId,
        nombre: categoriaActualizada.nombre,
        camposActualizados: camposActualizados,
        valoresAnteriores: categoria ? {
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          imagenUrl: categoria.imagenUrl,
          ordenVisualizacion: categoria.ordenVisualizacion,
          activa: categoria.activa,
        } : null,
        valoresNuevos: actualizarCategoriaDto,
      },
      metadata: {
        tipoOperacion: 'actualizar_categoria',
        camposModificados: camposActualizados,
        cantidadCamposModificados: camposActualizados.length,
        timestamp: new Date().toISOString(),
      },
    });

    return categoriaActualizada;
  }

  /**
   * Elimina una categoría
   */
  async eliminar(
    categoriaId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar categoría: ${categoriaId}`, { usuarioId });

    const categoria = await this.obtenerPorId(categoriaId);
    if (!categoria) {
      this.handleError('Categoría no encontrada', null, 404);
    }

    // Verificar que no esté siendo usada por items del menú
    const itemsConCategoria = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM items_menu
      WHERE categoria_id = @0 AND fecha_eliminacion IS NULL
    `, [categoriaId]);

    if (itemsConCategoria && itemsConCategoria[0] && itemsConCategoria[0].total > 0) {
      this.handleError(
        `No se puede eliminar la categoría porque tiene ${itemsConCategoria[0].total} item(s) del menú asignado(s)`,
        null,
        400
      );
    }

    await AppDataSource.query(`DELETE FROM categorias WHERE id = @0`, [categoriaId]);

    this.logger.info('Categoría eliminada exitosamente', {
      categoria: this.logCategory,
      restauranteId: categoria!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'categoria',
      entidadId: categoriaId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: categoriaId,
        restauranteId: categoria!.restauranteId,
        nombre: categoria!.nombre,
        ordenVisualizacion: categoria!.ordenVisualizacion,
        activa: categoria!.activa,
      },
      metadata: {
        tipoOperacion: 'eliminar_categoria',
        tipoEliminacion: 'hard_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

