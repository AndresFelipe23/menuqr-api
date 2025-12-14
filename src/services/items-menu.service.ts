import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearItemMenuDto, ActualizarItemMenuDto, QueryItemMenuDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { SuscripcionesService } from './suscripciones.service';

export interface ItemMenu {
  id: string;
  restauranteId: string;
  categoriaId: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagenUrl: string | null;
  calorias: number | null;
  alergenos: string | null; // JSON array como string
  disponible: boolean;
  destacado: boolean;
  ordenVisualizacion: number;
  tiempoPreparacion: number | null;
  esVegetariano: boolean;
  esVegano: boolean;
  sinGluten: boolean;
  esPicante: boolean;
  nivelPicante: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaEliminacion: Date | null;
}

export interface ItemMenuConAdiciones extends ItemMenu {
  adiciones?: Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
  }>;
}

export interface PaginatedItemsMenu {
  items: ItemMenuConAdiciones[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ItemsMenuService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz ItemMenu
   */
  private mapToItemMenu(row: any): ItemMenu {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      categoriaId: row.categoria_id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      precio: parseFloat(row.precio) || 0,
      imagenUrl: row.imagen_url,
      calorias: row.calorias ? parseInt(row.calorias, 10) : null,
      alergenos: row.alergenos,
      disponible: row.disponible === 1 || row.disponible === true,
      destacado: row.destacado === 1 || row.destacado === true,
      ordenVisualizacion: row.orden_visualizacion || 0,
      tiempoPreparacion: row.tiempo_preparacion ? parseInt(row.tiempo_preparacion, 10) : null,
      esVegetariano: row.es_vegetariano === 1 || row.es_vegetariano === true,
      esVegano: row.es_vegano === 1 || row.es_vegano === true,
      sinGluten: row.sin_gluten === 1 || row.sin_gluten === true,
      esPicante: row.es_picante === 1 || row.es_picante === true,
      nivelPicante: row.nivel_picante ? parseInt(row.nivel_picante, 10) : 0,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
      fechaEliminacion: row.fecha_eliminacion,
    };
  }

  /**
   * Obtiene las adiciones de un item del menú
   */
  private async obtenerAdicionesDeItem(itemMenuId: string): Promise<Array<{ id: string; nombre: string; descripcion: string | null; precio: number }>> {
    const adiciones = await AppDataSource.query(`
      SELECT 
        a.id,
        a.nombre,
        a.descripcion,
        a.precio
      FROM adiciones a
      INNER JOIN items_menu_adiciones ima ON ima.adicion_id = a.id
      WHERE ima.item_menu_id = @0 AND a.activa = 1
      ORDER BY a.orden_visualizacion ASC, a.nombre ASC
    `, [itemMenuId]);

    return adiciones.map((a: any) => ({
      id: a.id,
      nombre: a.nombre,
      descripcion: a.descripcion,
      precio: parseFloat(a.precio) || 0,
    }));
  }

  /**
   * Obtiene todos los items del menú con paginación y filtros
   */
  async obtenerTodos(query: QueryItemMenuDto): Promise<PaginatedItemsMenu> {
    this.logOperation('obtener todos los items del menú', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = ['im.fecha_eliminacion IS NULL'];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`im.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.categoriaId) {
      condiciones.push(`im.categoria_id = @${indice}`);
      parametros.push(query.categoriaId);
      indice++;
    }

    if (query.nombre) {
      condiciones.push(`im.nombre LIKE @${indice}`);
      parametros.push(`%${query.nombre}%`);
      indice++;
    }

    if (query.disponible !== undefined) {
      condiciones.push(`im.disponible = @${indice}`);
      parametros.push(query.disponible ? 1 : 0);
      indice++;
    }

    if (query.destacado !== undefined) {
      condiciones.push(`im.destacado = @${indice}`);
      parametros.push(query.destacado ? 1 : 0);
      indice++;
    }

    if (query.esVegetariano !== undefined) {
      condiciones.push(`im.es_vegetariano = @${indice}`);
      parametros.push(query.esVegetariano ? 1 : 0);
      indice++;
    }

    if (query.esVegano !== undefined) {
      condiciones.push(`im.es_vegano = @${indice}`);
      parametros.push(query.esVegano ? 1 : 0);
      indice++;
    }

    if (query.sinGluten !== undefined) {
      condiciones.push(`im.sin_gluten = @${indice}`);
      parametros.push(query.sinGluten ? 1 : 0);
      indice++;
    }

    if (query.esPicante !== undefined) {
      condiciones.push(`im.es_picante = @${indice}`);
      parametros.push(query.esPicante ? 1 : 0);
      indice++;
    }

    const whereClause = `WHERE ${condiciones.join(' AND ')}`;

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM items_menu im
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener items
    const items = await AppDataSource.query(`
      SELECT 
        im.id, im.restaurante_id, im.categoria_id, im.nombre, im.descripcion,
        im.precio, im.imagen_url, im.calorias, im.alergenos,
        im.disponible, im.destacado, im.orden_visualizacion,
        im.tiempo_preparacion, im.es_vegetariano, im.es_vegano,
        im.sin_gluten, im.es_picante, im.nivel_picante,
        im.fecha_creacion, im.fecha_actualizacion, im.fecha_eliminacion
      FROM items_menu im
      ${whereClause}
      ORDER BY im.orden_visualizacion ${orden}, im.nombre ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    // Obtener adiciones para cada item
    const itemsConAdiciones: ItemMenuConAdiciones[] = [];
    for (const item of items) {
      const itemMenu = this.mapToItemMenu(item);
      const adiciones = await this.obtenerAdicionesDeItem(itemMenu.id);
      itemsConAdiciones.push({
        ...itemMenu,
        adiciones,
      });
    }

    return {
      items: itemsConAdiciones,
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
   * Obtiene un item del menú por ID
   */
  async obtenerPorId(itemMenuId: string): Promise<ItemMenuConAdiciones | null> {
    this.logOperation(`obtener item del menú por ID: ${itemMenuId}`);

    const items = await AppDataSource.query(`
      SELECT 
        im.id, im.restaurante_id, im.categoria_id, im.nombre, im.descripcion,
        im.precio, im.imagen_url, im.calorias, im.alergenos,
        im.disponible, im.destacado, im.orden_visualizacion,
        im.tiempo_preparacion, im.es_vegetariano, im.es_vegano,
        im.sin_gluten, im.es_picante, im.nivel_picante,
        im.fecha_creacion, im.fecha_actualizacion, im.fecha_eliminacion
      FROM items_menu im
      WHERE im.id = @0 AND im.fecha_eliminacion IS NULL
    `, [itemMenuId]);

    if (!items || items.length === 0) {
      return null;
    }

    const itemMenu = this.mapToItemMenu(items[0]);
    const adiciones = await this.obtenerAdicionesDeItem(itemMenu.id);

    return {
      ...itemMenu,
      adiciones,
    };
  }

  /**
   * Obtiene todos los items del menú de un restaurante específico
   * @param restauranteId - ID del restaurante
   * @param soloDisponibles - Si es true, solo devuelve items disponibles (para rutas públicas)
   */
  async obtenerPorRestauranteId(restauranteId: string, soloDisponibles: boolean = false): Promise<ItemMenuConAdiciones[]> {
    this.logOperation(`obtener items del menú por restauranteId: ${restauranteId}`, { soloDisponibles });

    let query = `
      SELECT 
        im.id, im.restaurante_id, im.categoria_id, im.nombre, im.descripcion,
        im.precio, im.imagen_url, im.calorias, im.alergenos,
        im.disponible, im.destacado, im.orden_visualizacion,
        im.tiempo_preparacion, im.es_vegetariano, im.es_vegano,
        im.sin_gluten, im.es_picante, im.nivel_picante,
        im.fecha_creacion, im.fecha_actualizacion, im.fecha_eliminacion
      FROM items_menu im
      WHERE im.restaurante_id = @0 AND im.fecha_eliminacion IS NULL
    `;
    
    if (soloDisponibles) {
      query += ' AND im.disponible = 1';
    }
    
    query += ' ORDER BY im.orden_visualizacion ASC, im.nombre ASC';

    const items = await AppDataSource.query(query, [restauranteId]);

    // Obtener adiciones para cada item
    const itemsConAdiciones: ItemMenuConAdiciones[] = [];
    for (const item of items) {
      const itemMenu = this.mapToItemMenu(item);
      const adiciones = await this.obtenerAdicionesDeItem(itemMenu.id);
      itemsConAdiciones.push({
        ...itemMenu,
        adiciones,
      });
    }

    return itemsConAdiciones;
  }

  /**
   * Obtiene todos los items del menú de una categoría específica
   */
  async obtenerPorCategoriaId(categoriaId: string): Promise<ItemMenuConAdiciones[]> {
    this.logOperation(`obtener items del menú por categoriaId: ${categoriaId}`);

    const items = await AppDataSource.query(`
      SELECT 
        im.id, im.restaurante_id, im.categoria_id, im.nombre, im.descripcion,
        im.precio, im.imagen_url, im.calorias, im.alergenos,
        im.disponible, im.destacado, im.orden_visualizacion,
        im.tiempo_preparacion, im.es_vegetariano, im.es_vegano,
        im.sin_gluten, im.es_picante, im.nivel_picante,
        im.fecha_creacion, im.fecha_actualizacion, im.fecha_eliminacion
      FROM items_menu im
      WHERE im.categoria_id = @0 AND im.fecha_eliminacion IS NULL
      ORDER BY im.orden_visualizacion ASC, im.nombre ASC
    `, [categoriaId]);

    // Obtener adiciones para cada item
    const itemsConAdiciones: ItemMenuConAdiciones[] = [];
    for (const item of items) {
      const itemMenu = this.mapToItemMenu(item);
      const adiciones = await this.obtenerAdicionesDeItem(itemMenu.id);
      itemsConAdiciones.push({
        ...itemMenu,
        adiciones,
      });
    }

    return itemsConAdiciones;
  }

  /**
   * Crea un nuevo item del menú
   */
  async crear(
    crearItemMenuDto: CrearItemMenuDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<ItemMenuConAdiciones> {
    this.logOperation('crear item del menú', { data: crearItemMenuDto, usuarioId });

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearItemMenuDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar límites de suscripción
    try {
      const suscripcionesService = new SuscripcionesService();
      const limites = await suscripcionesService.verificarLimites(crearItemMenuDto.restauranteId, 'items');
      
      if (!limites.permitido) {
        const mensaje = limites.limite === -1 
          ? 'No se puede crear más items. Por favor, actualiza tu plan para obtener límites ilimitados.'
          : `Has alcanzado el límite de ${limites.limite} items de tu plan actual (${limites.actual}/${limites.limite}). ` +
            'Por favor, actualiza tu plan para crear más items.';
        this.handleError(mensaje, null, 403);
      }
    } catch (error: any) {
      // Si hay error al verificar límites, continuar (no bloquear)
      this.logger.warn('Error al verificar límites de suscripción', {
        categoria: this.logCategory,
        restauranteId: crearItemMenuDto.restauranteId,
        detalle: { error: error.message },
      });
    }

    // Verificar que la categoría existe y pertenece al restaurante
    const categoria = await AppDataSource.query(
      `SELECT id, nombre, restaurante_id FROM categorias WHERE id = @0`,
      [crearItemMenuDto.categoriaId]
    );

    if (!categoria || categoria.length === 0) {
      this.handleError('Categoría no encontrada', null, 404);
    }

    if (categoria[0].restaurante_id !== crearItemMenuDto.restauranteId) {
      this.handleError('La categoría no pertenece a este restaurante', null, 400);
    }

    // Si no se especifica orden, obtener el siguiente orden disponible
    let ordenVisualizacion = crearItemMenuDto.ordenVisualizacion;
    if (ordenVisualizacion === undefined) {
      const maxOrden = await AppDataSource.query(
        `SELECT MAX(orden_visualizacion) as max_orden FROM items_menu WHERE restaurante_id = @0 AND categoria_id = @1 AND fecha_eliminacion IS NULL`,
        [crearItemMenuDto.restauranteId, crearItemMenuDto.categoriaId]
      );
      ordenVisualizacion = (maxOrden[0]?.max_orden || 0) + 1;
    }

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Convertir alergenos a JSON string si es array
    let alergenosJson = null;
    if (crearItemMenuDto.alergenos && Array.isArray(crearItemMenuDto.alergenos)) {
      alergenosJson = JSON.stringify(crearItemMenuDto.alergenos);
    }

    // Crear el item del menú
    const resultado = await AppDataSource.query(`
      INSERT INTO items_menu (
        restaurante_id, categoria_id, nombre, descripcion, precio, imagen_url,
        calorias, alergenos, disponible, destacado, orden_visualizacion,
        tiempo_preparacion, es_vegetariano, es_vegano, sin_gluten,
        es_picante, nivel_picante, fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.categoria_id,
             INSERTED.nombre, INSERTED.descripcion, INSERTED.precio,
             INSERTED.imagen_url, INSERTED.calorias, INSERTED.alergenos,
             INSERTED.disponible, INSERTED.destacado, INSERTED.orden_visualizacion,
             INSERTED.tiempo_preparacion, INSERTED.es_vegetariano, INSERTED.es_vegano,
             INSERTED.sin_gluten, INSERTED.es_picante, INSERTED.nivel_picante,
             INSERTED.fecha_creacion, INSERTED.fecha_actualizacion, INSERTED.fecha_eliminacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @12, @13, @14, @15, @16, @17, @18
      )
    `, [
      crearItemMenuDto.restauranteId,
      crearItemMenuDto.categoriaId,
      crearItemMenuDto.nombre,
      crearItemMenuDto.descripcion || null,
      crearItemMenuDto.precio,
      crearItemMenuDto.imagenUrl || null,
      crearItemMenuDto.calorias || null,
      alergenosJson,
      crearItemMenuDto.disponible !== undefined ? (crearItemMenuDto.disponible ? 1 : 0) : 1,
      crearItemMenuDto.destacado !== undefined ? (crearItemMenuDto.destacado ? 1 : 0) : 0,
      ordenVisualizacion,
      crearItemMenuDto.tiempoPreparacion || null,
      crearItemMenuDto.esVegetariano !== undefined ? (crearItemMenuDto.esVegetariano ? 1 : 0) : 0,
      crearItemMenuDto.esVegano !== undefined ? (crearItemMenuDto.esVegano ? 1 : 0) : 0,
      crearItemMenuDto.sinGluten !== undefined ? (crearItemMenuDto.sinGluten ? 1 : 0) : 0,
      crearItemMenuDto.esPicante !== undefined ? (crearItemMenuDto.esPicante ? 1 : 0) : 0,
      crearItemMenuDto.nivelPicante || 0,
      fechaActual,
      fechaActual,
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear el item del menú', null, 500);
    }

    const nuevoItem = this.mapToItemMenu(resultado[0]);

    // Asociar adiciones si se proporcionaron
    if (crearItemMenuDto.adicionesIds && crearItemMenuDto.adicionesIds.length > 0) {
      await this.asociarAdiciones(nuevoItem.id, crearItemMenuDto.adicionesIds, crearItemMenuDto.restauranteId);
    }

    // Obtener adiciones asociadas
    const adiciones = await this.obtenerAdicionesDeItem(nuevoItem.id);

    this.logger.info('Item del menú creado exitosamente', {
      categoria: this.logCategory,
      restauranteId: nuevoItem.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'item_menu',
      entidadId: nuevoItem.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: nuevoItem.id,
        restauranteId: nuevoItem.restauranteId,
        categoriaId: nuevoItem.categoriaId,
        nombre: nuevoItem.nombre,
        precio: nuevoItem.precio,
        disponible: nuevoItem.disponible,
        destacado: nuevoItem.destacado,
        ordenVisualizacion: nuevoItem.ordenVisualizacion,
        adicionesCount: adiciones.length,
      },
      metadata: {
        tipoOperacion: 'crear_item_menu',
        camposProporcionados: Object.keys(crearItemMenuDto),
        tieneAdiciones: (crearItemMenuDto.adicionesIds?.length || 0) > 0,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      ...nuevoItem,
      adiciones,
    };
  }

  /**
   * Asocia adiciones a un item del menú
   */
  private async asociarAdiciones(itemMenuId: string, adicionesIds: string[], restauranteId: string): Promise<void> {
    // Verificar que todas las adiciones existan y pertenezcan al restaurante
    for (const adicionId of adicionesIds) {
      const adicion = await AppDataSource.query(
        `SELECT id, restaurante_id FROM adiciones WHERE id = @0 AND activa = 1`,
        [adicionId]
      );

      if (!adicion || adicion.length === 0) {
        this.handleError(`Adición no encontrada: ${adicionId}`, null, 404);
      }

      if (adicion[0].restaurante_id !== restauranteId) {
        this.handleError(`La adición no pertenece a este restaurante: ${adicionId}`, null, 400);
      }
    }

    // Eliminar asociaciones existentes
    await AppDataSource.query(
      `DELETE FROM items_menu_adiciones WHERE item_menu_id = @0`,
      [itemMenuId]
    );

    // Crear nuevas asociaciones
    for (const adicionId of adicionesIds) {
      await AppDataSource.query(
        `INSERT INTO items_menu_adiciones (item_menu_id, adicion_id) VALUES (@0, @1)`,
        [itemMenuId, adicionId]
      );
    }
  }

  /**
   * Actualiza un item del menú
   */
  async actualizar(
    itemMenuId: string,
    actualizarItemMenuDto: ActualizarItemMenuDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<ItemMenuConAdiciones> {
    this.logOperation(`actualizar item del menú: ${itemMenuId}`, { data: actualizarItemMenuDto, usuarioId });

    const item = await this.obtenerPorId(itemMenuId);
    if (!item) {
      this.handleError('Item del menú no encontrado', null, 404);
    }

    // Verificar categoría si se actualiza
    if (actualizarItemMenuDto.categoriaId) {
      const categoria = await AppDataSource.query(
        `SELECT id, restaurante_id FROM categorias WHERE id = @0`,
        [actualizarItemMenuDto.categoriaId]
      );

      if (!categoria || categoria.length === 0) {
        this.handleError('Categoría no encontrada', null, 404);
      }

      if (categoria[0].restaurante_id !== item!.restauranteId) {
        this.handleError('La categoría no pertenece a este restaurante', null, 400);
      }
    }

    // Construir campos a actualizar
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarItemMenuDto.categoriaId !== undefined) {
      campos.push(`categoria_id = @${indice}`);
      valores.push(actualizarItemMenuDto.categoriaId);
      indice++;
    }

    if (actualizarItemMenuDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarItemMenuDto.nombre);
      indice++;
    }

    if (actualizarItemMenuDto.descripcion !== undefined) {
      campos.push(`descripcion = @${indice}`);
      valores.push(actualizarItemMenuDto.descripcion || null);
      indice++;
    }

    if (actualizarItemMenuDto.precio !== undefined) {
      campos.push(`precio = @${indice}`);
      valores.push(actualizarItemMenuDto.precio);
      indice++;
    }

    if (actualizarItemMenuDto.imagenUrl !== undefined) {
      campos.push(`imagen_url = @${indice}`);
      valores.push(actualizarItemMenuDto.imagenUrl || null);
      indice++;
    }

    if (actualizarItemMenuDto.calorias !== undefined) {
      campos.push(`calorias = @${indice}`);
      valores.push(actualizarItemMenuDto.calorias || null);
      indice++;
    }

    if (actualizarItemMenuDto.alergenos !== undefined) {
      let alergenosJson = null;
      if (Array.isArray(actualizarItemMenuDto.alergenos)) {
        alergenosJson = JSON.stringify(actualizarItemMenuDto.alergenos);
      }
      campos.push(`alergenos = @${indice}`);
      valores.push(alergenosJson);
      indice++;
    }

    if (actualizarItemMenuDto.disponible !== undefined) {
      campos.push(`disponible = @${indice}`);
      valores.push(actualizarItemMenuDto.disponible ? 1 : 0);
      indice++;
    }

    if (actualizarItemMenuDto.destacado !== undefined) {
      campos.push(`destacado = @${indice}`);
      valores.push(actualizarItemMenuDto.destacado ? 1 : 0);
      indice++;
    }

    if (actualizarItemMenuDto.ordenVisualizacion !== undefined) {
      campos.push(`orden_visualizacion = @${indice}`);
      valores.push(actualizarItemMenuDto.ordenVisualizacion);
      indice++;
    }

    if (actualizarItemMenuDto.tiempoPreparacion !== undefined) {
      campos.push(`tiempo_preparacion = @${indice}`);
      valores.push(actualizarItemMenuDto.tiempoPreparacion || null);
      indice++;
    }

    if (actualizarItemMenuDto.esVegetariano !== undefined) {
      campos.push(`es_vegetariano = @${indice}`);
      valores.push(actualizarItemMenuDto.esVegetariano ? 1 : 0);
      indice++;
    }

    if (actualizarItemMenuDto.esVegano !== undefined) {
      campos.push(`es_vegano = @${indice}`);
      valores.push(actualizarItemMenuDto.esVegano ? 1 : 0);
      indice++;
    }

    if (actualizarItemMenuDto.sinGluten !== undefined) {
      campos.push(`sin_gluten = @${indice}`);
      valores.push(actualizarItemMenuDto.sinGluten ? 1 : 0);
      indice++;
    }

    if (actualizarItemMenuDto.esPicante !== undefined) {
      campos.push(`es_picante = @${indice}`);
      valores.push(actualizarItemMenuDto.esPicante ? 1 : 0);
      indice++;
    }

    if (actualizarItemMenuDto.nivelPicante !== undefined) {
      campos.push(`nivel_picante = @${indice}`);
      valores.push(actualizarItemMenuDto.nivelPicante);
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
        `UPDATE items_menu SET fecha_actualizacion = @0 WHERE id = @1`,
        [fechaActual, itemMenuId]
      );
    } else {
      valores.push(itemMenuId);
      await AppDataSource.query(
        `UPDATE items_menu SET ${campos.join(', ')} WHERE id = @${indice}`,
        valores
      );
    }

    // Actualizar adiciones si se proporcionaron
    if (actualizarItemMenuDto.adicionesIds !== undefined) {
      await this.asociarAdiciones(itemMenuId, actualizarItemMenuDto.adicionesIds, item!.restauranteId);
    }

    // Obtener item actualizado
    const itemActualizado = await this.obtenerPorId(itemMenuId);
    if (!itemActualizado) {
      this.handleError('Error al obtener el item actualizado', null, 500);
    }

    this.logger.info('Item del menú actualizado exitosamente', {
      categoria: this.logCategory,
      restauranteId: item!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'item_menu',
      entidadId: itemMenuId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: itemMenuId,
        restauranteId: item!.restauranteId,
        categoriaId: itemActualizado.categoriaId,
        nombre: itemActualizado.nombre,
        precio: itemActualizado.precio,
        disponible: itemActualizado.disponible,
        destacado: itemActualizado.destacado,
        adicionesCount: itemActualizado.adiciones?.length || 0,
      },
      metadata: {
        tipoOperacion: 'actualizar_item_menu',
        camposActualizados: Object.keys(actualizarItemMenuDto),
        tieneAdiciones: (actualizarItemMenuDto.adicionesIds?.length || 0) > 0,
        timestamp: new Date().toISOString(),
      },
    });

    return itemActualizado!;
  }

  /**
   * Elimina un item del menú (soft delete)
   */
  async eliminar(
    itemMenuId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar item del menú: ${itemMenuId}`, { usuarioId });

    const item = await this.obtenerPorId(itemMenuId);
    if (!item) {
      this.handleError('Item del menú no encontrado', null, 404);
    }

    // Verificar que no esté siendo usado en pedidos activos
    const itemsEnPedidos = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM items_pedido ip
      INNER JOIN pedidos p ON ip.pedido_id = p.id
      WHERE ip.item_menu_id = @0 
        AND p.estado NOT IN ('completado', 'cancelado')
        AND p.fecha_eliminacion IS NULL
    `, [itemMenuId]);

    if (itemsEnPedidos && itemsEnPedidos[0] && itemsEnPedidos[0].total > 0) {
      this.handleError(
        `No se puede eliminar el item porque está siendo usado en ${itemsEnPedidos[0].total} pedido(s) activo(s)`,
        null,
        400
      );
    }

    // Soft delete
    const fechaActual = getMonteriaLocalDate();
    await AppDataSource.query(
      `UPDATE items_menu SET fecha_eliminacion = @0 WHERE id = @1`,
      [fechaActual, itemMenuId]
    );

    this.logger.info('Item del menú eliminado exitosamente', {
      categoria: this.logCategory,
      restauranteId: item!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'item_menu',
      entidadId: itemMenuId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: itemMenuId,
        restauranteId: item!.restauranteId,
        nombre: item!.nombre,
        categoriaId: item!.categoriaId,
        precio: item!.precio,
      },
      metadata: {
        tipoOperacion: 'eliminar_item_menu',
        tipoEliminacion: 'soft_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

