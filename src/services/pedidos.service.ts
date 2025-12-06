import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { CrearPedidoDto, ActualizarPedidoDto, QueryPedidoDto, EstadoPedido } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { webSocketService } from './websocket.service';

export interface ItemPedido {
  id: string;
  pedidoId: string;
  itemMenuId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  estado: string;
  notas: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface ItemPedidoConDetalles extends ItemPedido {
  itemMenuNombre?: string;
  itemMenuPrecio?: number;
  itemMenuImagenUrl?: string;
  adiciones?: Array<{
    id: string;
    adicionId: string;
    adicionNombre: string;
    modificadorPrecio: number;
  }>;
}

export interface Pedido {
  id: string;
  restauranteId: string;
  mesaId: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  correoCliente: string | null;
  estado: string;
  montoTotal: number;
  notas: string | null;
  instruccionesEspeciales: string | null;
  meseroAsignadoId: string | null;
  fechaCreacion: Date;
  fechaConfirmacion: Date | null;
  fechaPreparacion: Date | null;
  fechaListo: Date | null;
  fechaServido: Date | null;
  fechaCompletado: Date | null;
}

export interface PedidoCompleto extends Pedido {
  mesaNumero?: string;
  mesaNombre?: string;
  meseroNombre?: string;
  meseroEmail?: string;
  items?: ItemPedidoConDetalles[];
}

export interface PaginatedPedidos {
  items: PedidoCompleto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PedidosService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Convierte un resultado de base de datos a la interfaz Pedido
   */
  private mapToPedido(row: any): Pedido {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      mesaId: row.mesa_id,
      nombreCliente: row.nombre_cliente,
      telefonoCliente: row.telefono_cliente,
      correoCliente: row.correo_cliente,
      estado: row.estado,
      montoTotal: parseFloat(row.monto_total) || 0,
      notas: row.notas,
      instruccionesEspeciales: row.instrucciones_especiales,
      meseroAsignadoId: row.mesero_asignado_id,
      fechaCreacion: row.fecha_creacion,
      fechaConfirmacion: row.fecha_confirmacion,
      fechaPreparacion: row.fecha_preparacion,
      fechaListo: row.fecha_listo,
      fechaServido: row.fecha_servido,
      fechaCompletado: row.fecha_completado,
    };
  }

  /**
   * Obtiene los items de un pedido con detalles
   */
  private async obtenerItemsDePedido(pedidoId: string): Promise<ItemPedidoConDetalles[]> {
    const items = await AppDataSource.query(`
      SELECT 
        ip.id, ip.pedido_id, ip.item_menu_id, ip.cantidad,
        ip.precio_unitario, ip.subtotal, ip.estado, ip.notas,
        ip.fecha_creacion, ip.fecha_actualizacion,
        im.nombre as item_menu_nombre,
        im.precio as item_menu_precio,
        im.imagen_url as item_menu_imagen_url
      FROM items_pedido ip
      INNER JOIN items_menu im ON ip.item_menu_id = im.id
      WHERE ip.pedido_id = @0
      ORDER BY ip.fecha_creacion ASC
    `, [pedidoId]);

    const itemsConDetalles: ItemPedidoConDetalles[] = [];
    for (const item of items) {
      // Obtener adiciones del item (simplificado - sin opciones_adiciones por ahora)
      const adiciones = await AppDataSource.query(`
        SELECT 
          ipa.id,
          ipa.adicion_id,
          a.nombre as adicion_nombre,
          ipa.modificador_precio
        FROM items_pedido_adiciones ipa
        INNER JOIN adiciones a ON ipa.adicion_id = a.id
        WHERE ipa.item_pedido_id = @0
      `, [item.id]);

      itemsConDetalles.push({
        id: item.id,
        pedidoId: item.pedido_id,
        itemMenuId: item.item_menu_id,
        cantidad: parseInt(item.cantidad, 10),
        precioUnitario: parseFloat(item.precio_unitario) || 0,
        subtotal: parseFloat(item.subtotal) || 0,
        estado: item.estado,
        notas: item.notas,
        fechaCreacion: item.fecha_creacion,
        fechaActualizacion: item.fecha_actualizacion,
        itemMenuNombre: item.item_menu_nombre,
        itemMenuPrecio: parseFloat(item.item_menu_precio) || 0,
        itemMenuImagenUrl: item.item_menu_imagen_url || undefined,
        adiciones: adiciones.map((a: any) => ({
          id: a.id,
          adicionId: a.adicion_id,
          adicionNombre: a.adicion_nombre,
          modificadorPrecio: parseFloat(a.modificador_precio) || 0,
        })),
      });
    }

    return itemsConDetalles;
  }

  /**
   * Obtiene todos los pedidos con paginación y filtros
   */
  async obtenerTodos(query: QueryPedidoDto): Promise<PaginatedPedidos> {
    this.logOperation('obtener todos los pedidos', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = [];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`p.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.mesaId) {
      condiciones.push(`p.mesa_id = @${indice}`);
      parametros.push(query.mesaId);
      indice++;
    }

    if (query.meseroAsignadoId) {
      condiciones.push(`p.mesero_asignado_id = @${indice}`);
      parametros.push(query.meseroAsignadoId);
      indice++;
    }

    if (query.estado) {
      condiciones.push(`p.estado = @${indice}`);
      parametros.push(query.estado);
      indice++;
    }

    if (query.nombreCliente) {
      condiciones.push(`p.nombre_cliente LIKE @${indice}`);
      parametros.push(`%${query.nombreCliente}%`);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM pedidos p
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener pedidos con información de mesa y mesero
    const pedidos = await AppDataSource.query(`
      SELECT 
        p.id, p.restaurante_id, p.mesa_id, p.nombre_cliente,
        p.telefono_cliente, p.correo_cliente, p.estado, p.monto_total,
        p.notas, p.instrucciones_especiales, p.mesero_asignado_id,
        p.fecha_creacion, p.fecha_confirmacion, p.fecha_preparacion,
        p.fecha_listo, p.fecha_servido, p.fecha_completado,
        m.numero as mesa_numero,
        m.nombre as mesa_nombre,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.mesero_asignado_id = u.id
      ${whereClause}
      ORDER BY p.fecha_creacion ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    // Obtener items para cada pedido
    const pedidosCompletos: PedidoCompleto[] = [];
    for (const pedido of pedidos) {
      const pedidoMapeado = this.mapToPedido(pedido);
      const items = await this.obtenerItemsDePedido(pedidoMapeado.id);
      pedidosCompletos.push({
        ...pedidoMapeado,
        mesaNumero: pedido.mesa_numero,
        mesaNombre: pedido.mesa_nombre,
        meseroNombre: pedido.mesero_nombre,
        meseroEmail: pedido.mesero_email,
        items,
      });
    }

    return {
      items: pedidosCompletos,
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
   * Obtiene un pedido por ID
   */
  async obtenerPorId(pedidoId: string): Promise<PedidoCompleto | null> {
    this.logOperation(`obtener pedido por ID: ${pedidoId}`);

    const pedidos = await AppDataSource.query(`
      SELECT 
        p.id, p.restaurante_id, p.mesa_id, p.nombre_cliente,
        p.telefono_cliente, p.correo_cliente, p.estado, p.monto_total,
        p.notas, p.instrucciones_especiales, p.mesero_asignado_id,
        p.fecha_creacion, p.fecha_confirmacion, p.fecha_preparacion,
        p.fecha_listo, p.fecha_servido, p.fecha_completado,
        m.numero as mesa_numero,
        m.nombre as mesa_nombre,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.mesero_asignado_id = u.id
      WHERE p.id = @0
    `, [pedidoId]);

    if (!pedidos || pedidos.length === 0) {
      return null;
    }

    const pedidoMapeado = this.mapToPedido(pedidos[0]);
    const items = await this.obtenerItemsDePedido(pedidoMapeado.id);

    return {
      ...pedidoMapeado,
      mesaNumero: pedidos[0].mesa_numero,
      mesaNombre: pedidos[0].mesa_nombre,
      meseroNombre: pedidos[0].mesero_nombre,
      meseroEmail: pedidos[0].mesero_email,
      items,
    };
  }

  /**
   * Obtiene todos los pedidos de un restaurante
   */
  async obtenerPorRestauranteId(restauranteId: string): Promise<PedidoCompleto[]> {
    this.logOperation(`obtener pedidos por restauranteId: ${restauranteId}`);

    const pedidos = await AppDataSource.query(`
      SELECT 
        p.id, p.restaurante_id, p.mesa_id, p.nombre_cliente,
        p.telefono_cliente, p.correo_cliente, p.estado, p.monto_total,
        p.notas, p.instrucciones_especiales, p.mesero_asignado_id,
        p.fecha_creacion, p.fecha_confirmacion, p.fecha_preparacion,
        p.fecha_listo, p.fecha_servido, p.fecha_completado,
        m.numero as mesa_numero,
        m.nombre as mesa_nombre,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.mesero_asignado_id = u.id
      WHERE p.restaurante_id = @0
      ORDER BY p.fecha_creacion DESC
    `, [restauranteId]);

    // Obtener items para cada pedido
    const pedidosCompletos: PedidoCompleto[] = [];
    for (const pedido of pedidos) {
      const pedidoMapeado = this.mapToPedido(pedido);
      const items = await this.obtenerItemsDePedido(pedidoMapeado.id);
      pedidosCompletos.push({
        ...pedidoMapeado,
        mesaNumero: pedido.mesa_numero,
        mesaNombre: pedido.mesa_nombre,
        meseroNombre: pedido.mesero_nombre,
        meseroEmail: pedido.mesero_email,
        items,
      });
    }

    return pedidosCompletos;
  }

  /**
   * Obtiene todos los pedidos de una mesa
   */
  async obtenerPorMesaId(mesaId: string): Promise<PedidoCompleto[]> {
    this.logOperation(`obtener pedidos por mesaId: ${mesaId}`);

    const pedidos = await AppDataSource.query(`
      SELECT 
        p.id, p.restaurante_id, p.mesa_id, p.nombre_cliente,
        p.telefono_cliente, p.correo_cliente, p.estado, p.monto_total,
        p.notas, p.instrucciones_especiales, p.mesero_asignado_id,
        p.fecha_creacion, p.fecha_confirmacion, p.fecha_preparacion,
        p.fecha_listo, p.fecha_servido, p.fecha_completado,
        m.numero as mesa_numero,
        m.nombre as mesa_nombre,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.mesero_asignado_id = u.id
      WHERE p.mesa_id = @0
      ORDER BY p.fecha_creacion DESC
    `, [mesaId]);

    // Obtener items para cada pedido
    const pedidosCompletos: PedidoCompleto[] = [];
    for (const pedido of pedidos) {
      const pedidoMapeado = this.mapToPedido(pedido);
      const items = await this.obtenerItemsDePedido(pedidoMapeado.id);
      pedidosCompletos.push({
        ...pedidoMapeado,
        mesaNumero: pedido.mesa_numero,
        mesaNombre: pedido.mesa_nombre,
        meseroNombre: pedido.mesero_nombre,
        meseroEmail: pedido.mesero_email,
        items,
      });
    }

    return pedidosCompletos;
  }

  /**
   * Crea un nuevo pedido con sus items
   */
  async crear(
    crearPedidoDto: CrearPedidoDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<PedidoCompleto> {
    this.logOperation('crear pedido', { data: crearPedidoDto, usuarioId });

    // Verificar que el restaurante existe y que los pedidos estén habilitados
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre, habilitar_pedidos FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearPedidoDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar que los pedidos estén habilitados
    if (restaurante[0].habilitar_pedidos === 0 || restaurante[0].habilitar_pedidos === false) {
      this.handleError('Los pedidos no están habilitados para este restaurante', null, 403);
    }

    // Verificar que la mesa existe y pertenece al restaurante
    const mesa = await AppDataSource.query(
      `SELECT id, numero, nombre, restaurante_id, mesero_asignado_id FROM mesas WHERE id = @0`,
      [crearPedidoDto.mesaId]
    );

    if (!mesa || mesa.length === 0) {
      this.handleError('Mesa no encontrada', null, 404);
    }

    if (mesa[0].restaurante_id !== crearPedidoDto.restauranteId) {
      this.handleError('La mesa no pertenece a este restaurante', null, 400);
    }

    // Determinar el mesero asignado: primero del DTO, si no viene, tomar el de la mesa
    let meseroAsignadoId = crearPedidoDto.meseroAsignadoId || mesa[0].mesero_asignado_id || null;

    // Verificar mesero si se proporciona o se toma de la mesa
    if (meseroAsignadoId) {
      const mesero = await AppDataSource.query(
        `SELECT id, nombre, apellido, correo, restaurante_id FROM usuarios WHERE id = @0 AND activo = 1`,
        [meseroAsignadoId]
      );

      if (!mesero || mesero.length === 0) {
        // Si el mesero no existe, no asignar mesero (pero no fallar)
        meseroAsignadoId = null;
      } else if (mesero[0].restaurante_id !== crearPedidoDto.restauranteId) {
        // Si el mesero no pertenece al restaurante, no asignar (pero no fallar)
        meseroAsignadoId = null;
      }
    }

    // Validar y calcular precios de items
    let montoTotal = 0;
    const itemsConPrecios: Array<{
      itemMenuId: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      notas?: string;
      adicionesIds?: string[];
    }> = [];

    for (const item of crearPedidoDto.items) {
      // Obtener el item del menú
      const itemMenu = await AppDataSource.query(
        `SELECT id, nombre, precio, disponible FROM items_menu WHERE id = @0 AND fecha_eliminacion IS NULL`,
        [item.itemMenuId]
      );

      if (!itemMenu || itemMenu.length === 0) {
        this.handleError(`Item del menú no encontrado: ${item.itemMenuId}`, null, 404);
      }

      if (!itemMenu[0].disponible) {
        this.handleError(`El item del menú "${itemMenu[0].nombre}" no está disponible`, null, 400);
      }

      const precioUnitario = parseFloat(itemMenu[0].precio) || 0;
      let subtotalItem = precioUnitario * item.cantidad;

      // Calcular precio de adiciones si se proporcionan
      if (item.adicionesIds && item.adicionesIds.length > 0) {
        for (const adicionId of item.adicionesIds) {
          const adicion = await AppDataSource.query(
            `SELECT id, nombre, precio FROM adiciones WHERE id = @0 AND activa = 1`,
            [adicionId]
          );

          if (!adicion || adicion.length === 0) {
            this.handleError(`Adición no encontrada: ${adicionId}`, null, 404);
          }

          subtotalItem += parseFloat(adicion[0].precio) || 0;
        }
      }

      itemsConPrecios.push({
        itemMenuId: item.itemMenuId,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal: subtotalItem,
        notas: item.notas,
        adicionesIds: item.adicionesIds,
      });

      montoTotal += subtotalItem;
    }

    // Obtener fecha actual
    const fechaActual = getMonteriaLocalDate();

    // Determinar estado inicial: si es pedido público (sin usuarioId), requiere confirmación
    const estadoInicial = usuarioId ? EstadoPedido.PENDIENTE : EstadoPedido.PENDIENTE_CONFIRMACION;

    // Crear el pedido
    const resultadoPedido = await AppDataSource.query(`
      INSERT INTO pedidos (
        restaurante_id, mesa_id, nombre_cliente, telefono_cliente,
        correo_cliente, estado, monto_total, notas, instrucciones_especiales,
        mesero_asignado_id, fecha_creacion
      )
      OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.mesa_id,
             INSERTED.nombre_cliente, INSERTED.telefono_cliente,
             INSERTED.correo_cliente, INSERTED.estado, INSERTED.monto_total,
             INSERTED.notas, INSERTED.instrucciones_especiales,
             INSERTED.mesero_asignado_id, INSERTED.fecha_creacion,
             INSERTED.fecha_confirmacion, INSERTED.fecha_preparacion,
             INSERTED.fecha_listo, INSERTED.fecha_servido, INSERTED.fecha_completado
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10
      )
    `, [
      crearPedidoDto.restauranteId,
      crearPedidoDto.mesaId,
      crearPedidoDto.nombreCliente || null,
      crearPedidoDto.telefonoCliente || null,
      crearPedidoDto.correoCliente || null,
      estadoInicial,
      montoTotal,
      crearPedidoDto.notas || null,
      crearPedidoDto.instruccionesEspeciales || null,
      meseroAsignadoId,
      fechaActual,
    ]);

    if (!resultadoPedido || resultadoPedido.length === 0) {
      this.handleError('Error al crear el pedido', null, 500);
    }

    const nuevoPedido = this.mapToPedido(resultadoPedido[0]);

    // Crear items del pedido
    for (const itemConPrecio of itemsConPrecios) {
      const resultadoItem = await AppDataSource.query(`
        INSERT INTO items_pedido (
          pedido_id, item_menu_id, cantidad, precio_unitario,
          subtotal, estado, notas, fecha_creacion, fecha_actualizacion
        )
        OUTPUT INSERTED.id
        VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8)
      `, [
        nuevoPedido.id,
        itemConPrecio.itemMenuId,
        itemConPrecio.cantidad,
        itemConPrecio.precioUnitario,
        itemConPrecio.subtotal,
        'pendiente',
        itemConPrecio.notas || null,
        fechaActual,
        fechaActual,
      ]);

      const itemPedidoId = resultadoItem[0].id;

      // Crear adiciones del item si se proporcionaron
      if (itemConPrecio.adicionesIds && itemConPrecio.adicionesIds.length > 0) {
        for (const adicionId of itemConPrecio.adicionesIds) {
          // Obtener la primera opción de la adición (simplificado)
          // En una implementación completa, se debería seleccionar la opción específica
          const opcionAdicion = await AppDataSource.query(
            `SELECT TOP 1 id, modificador_precio FROM opciones_adiciones WHERE adicion_id = @0 AND activa = 1 ORDER BY orden_visualizacion ASC`,
            [adicionId]
          );

          if (opcionAdicion && opcionAdicion.length > 0) {
            await AppDataSource.query(
              `INSERT INTO items_pedido_adiciones (item_pedido_id, adicion_id, opcion_adicion_id, modificador_precio)
               VALUES (@0, @1, @2, @3)`,
              [
                itemPedidoId,
                adicionId,
                opcionAdicion[0].id,
                parseFloat(opcionAdicion[0].modificador_precio) || 0,
              ]
            );
          } else {
            // Si no hay opciones, crear una opción por defecto
            const adicion = await AppDataSource.query(
              `SELECT id, nombre, precio FROM adiciones WHERE id = @0`,
              [adicionId]
            );

            if (adicion && adicion.length > 0) {
              // Crear opción por defecto si no existe
              const opcionDefault = await AppDataSource.query(`
                INSERT INTO opciones_adiciones (adicion_id, nombre, modificador_precio, es_predeterminada, activa, fecha_creacion)
                OUTPUT INSERTED.id, INSERTED.modificador_precio
                VALUES (@0, @1, @2, 1, 1, @3)
              `, [
                adicionId,
                adicion[0].nombre || 'Opción por defecto',
                parseFloat(adicion[0].precio) || 0,
                fechaActual,
              ]);

              if (opcionDefault && opcionDefault.length > 0) {
                await AppDataSource.query(
                  `INSERT INTO items_pedido_adiciones (item_pedido_id, adicion_id, opcion_adicion_id, modificador_precio)
                   VALUES (@0, @1, @2, @3)`,
                  [
                    itemPedidoId,
                    adicionId,
                    opcionDefault[0].id,
                    parseFloat(opcionDefault[0].modificador_precio) || 0,
                  ]
                );
              }
            }
          }
        }
      }
    }

    // Obtener pedido completo
    const pedidoCompleto = await this.obtenerPorId(nuevoPedido.id);
    if (!pedidoCompleto) {
      this.handleError('Error al obtener el pedido creado', null, 500);
    }

    this.logger.info('Pedido creado exitosamente', {
      categoria: this.logCategory,
      restauranteId: nuevoPedido.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'pedido',
      entidadId: nuevoPedido.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: nuevoPedido.id,
        restauranteId: nuevoPedido.restauranteId,
        mesaId: nuevoPedido.mesaId,
        estado: nuevoPedido.estado,
        montoTotal: nuevoPedido.montoTotal,
        itemsCount: crearPedidoDto.items.length,
      },
      metadata: {
        tipoOperacion: 'crear_pedido',
        timestamp: new Date().toISOString(),
      },
    });

    // Emitir evento WebSocket de nuevo pedido
    if (pedidoCompleto) {
      await webSocketService.emitNuevoPedido({
        pedido: pedidoCompleto,
        restauranteId: pedidoCompleto.restauranteId,
        mesaId: pedidoCompleto.mesaId,
        meseroAsignadoId: pedidoCompleto.meseroAsignadoId || undefined,
      });
    }

    return pedidoCompleto!;
  }

  /**
   * Actualiza un pedido
   */
  async actualizar(
    pedidoId: string,
    actualizarPedidoDto: ActualizarPedidoDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<PedidoCompleto> {
    this.logOperation(`actualizar pedido: ${pedidoId}`, { data: actualizarPedidoDto, usuarioId });

    const pedido = await this.obtenerPorId(pedidoId);
    if (!pedido) {
      this.handleError('Pedido no encontrado', null, 404);
    }

    // Verificar mesero si se actualiza
    if (actualizarPedidoDto.meseroAsignadoId !== undefined) {
      if (actualizarPedidoDto.meseroAsignadoId) {
        const mesero = await AppDataSource.query(
          `SELECT id, restaurante_id FROM usuarios WHERE id = @0 AND activo = 1`,
          [actualizarPedidoDto.meseroAsignadoId]
        );

        if (!mesero || mesero.length === 0) {
          this.handleError('Mesero no encontrado', null, 404);
        }

        if (mesero[0].restaurante_id !== pedido!.restauranteId) {
          this.handleError('El mesero no pertenece a este restaurante', null, 400);
        }
      }
    }

    // Construir campos a actualizar
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;
    const fechaActual = getMonteriaLocalDate();

    if (actualizarPedidoDto.nombreCliente !== undefined) {
      campos.push(`nombre_cliente = @${indice}`);
      valores.push(actualizarPedidoDto.nombreCliente || null);
      indice++;
    }

    if (actualizarPedidoDto.telefonoCliente !== undefined) {
      campos.push(`telefono_cliente = @${indice}`);
      valores.push(actualizarPedidoDto.telefonoCliente || null);
      indice++;
    }

    if (actualizarPedidoDto.correoCliente !== undefined) {
      campos.push(`correo_cliente = @${indice}`);
      valores.push(actualizarPedidoDto.correoCliente || null);
      indice++;
    }

    if (actualizarPedidoDto.estado !== undefined) {
      campos.push(`estado = @${indice}`);
      valores.push(actualizarPedidoDto.estado);
      indice++;

      // Actualizar fechas según el estado
      const estadoAnterior = pedido!.estado;
      const estadoNuevo = actualizarPedidoDto.estado;

      if (estadoAnterior !== estadoNuevo) {
        // Registrar cambio de estado en historial (a nivel de pedido completo, item_pedido_id = NULL)
        await AppDataSource.query(
          `INSERT INTO historial_estado_pedido (pedido_id, item_pedido_id, estado_anterior, estado_nuevo, cambiado_por_id, fecha_creacion)
           VALUES (@0, @1, @2, @3, @4, @5)`,
          [pedidoId, null, estadoAnterior, estadoNuevo, usuarioId || null, fechaActual]
        );

        // Si se cambia el estado del pedido completo, actualizar todos los items pendientes/preparando
        // Mapeo de estados: pendiente -> pendiente, confirmado -> confirmado, preparando -> preparando, etc.
        const estadoItemMap: { [key: string]: string } = {
          [EstadoPedido.PENDIENTE]: 'pendiente',
          [EstadoPedido.PENDIENTE_CONFIRMACION]: 'pendiente',
          [EstadoPedido.CONFIRMADO]: 'confirmado',
          [EstadoPedido.PREPARANDO]: 'preparando',
          [EstadoPedido.LISTO]: 'listo',
          [EstadoPedido.SERVIDO]: 'servido',
          [EstadoPedido.COMPLETADO]: 'completado',
          [EstadoPedido.CANCELADO]: 'cancelado',
        };

        const estadoItem = estadoItemMap[estadoNuevo];
        if (estadoItem) {
          // Actualizar items que no estén en estados finales (servido, completado, cancelado)
          await AppDataSource.query(
            `UPDATE items_pedido 
             SET estado = @0, fecha_actualizacion = @1
             WHERE pedido_id = @2 
             AND estado NOT IN ('servido', 'completado', 'cancelado')`,
            [estadoItem, fechaActual, pedidoId]
          );
        }

        // Actualizar fechas según el estado
        if (estadoNuevo === EstadoPedido.CONFIRMADO && !pedido!.fechaConfirmacion) {
          campos.push(`fecha_confirmacion = @${indice}`);
          valores.push(fechaActual);
          indice++;
        } else if (estadoNuevo === EstadoPedido.PREPARANDO && !pedido!.fechaPreparacion) {
          campos.push(`fecha_preparacion = @${indice}`);
          valores.push(fechaActual);
          indice++;
        } else if (estadoNuevo === EstadoPedido.LISTO && !pedido!.fechaListo) {
          campos.push(`fecha_listo = @${indice}`);
          valores.push(fechaActual);
          indice++;
        } else if (estadoNuevo === EstadoPedido.SERVIDO && !pedido!.fechaServido) {
          campos.push(`fecha_servido = @${indice}`);
          valores.push(fechaActual);
          indice++;
        } else if (estadoNuevo === EstadoPedido.COMPLETADO && !pedido!.fechaCompletado) {
          campos.push(`fecha_completado = @${indice}`);
          valores.push(fechaActual);
          indice++;
        }
      }
    }

    if (actualizarPedidoDto.notas !== undefined) {
      campos.push(`notas = @${indice}`);
      valores.push(actualizarPedidoDto.notas || null);
      indice++;
    }

    if (actualizarPedidoDto.instruccionesEspeciales !== undefined) {
      campos.push(`instrucciones_especiales = @${indice}`);
      valores.push(actualizarPedidoDto.instruccionesEspeciales || null);
      indice++;
    }

    if (actualizarPedidoDto.meseroAsignadoId !== undefined) {
      campos.push(`mesero_asignado_id = @${indice}`);
      valores.push(actualizarPedidoDto.meseroAsignadoId || null);
      indice++;
    }

    if (campos.length > 0) {
      valores.push(pedidoId);
      await AppDataSource.query(
        `UPDATE pedidos SET ${campos.join(', ')} WHERE id = @${indice}`,
        valores
      );
    }

    // Obtener pedido actualizado
    const pedidoActualizado = await this.obtenerPorId(pedidoId);
    if (!pedidoActualizado) {
      this.handleError('Error al obtener el pedido actualizado', null, 500);
    }

    this.logger.info('Pedido actualizado exitosamente', {
      categoria: this.logCategory,
      restauranteId: pedido!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'pedido',
      entidadId: pedidoId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: pedidoId,
        restauranteId: pedido!.restauranteId,
        estado: pedidoActualizado!.estado,
        montoTotal: pedidoActualizado!.montoTotal,
      },
      metadata: {
        tipoOperacion: 'actualizar_pedido',
        camposActualizados: Object.keys(actualizarPedidoDto),
        cambioEstado: actualizarPedidoDto.estado !== undefined && actualizarPedidoDto.estado !== pedido!.estado,
        timestamp: new Date().toISOString(),
      },
    });

    // Emitir evento WebSocket de pedido actualizado
    if (pedidoActualizado) {
      await webSocketService.emitPedidoActualizado({
        pedido: pedidoActualizado,
        restauranteId: pedidoActualizado.restauranteId,
        mesaId: pedidoActualizado.mesaId,
        meseroAsignadoId: pedidoActualizado.meseroAsignadoId || undefined,
      });
    }

    return pedidoActualizado!;
  }

  /**
   * Calcula el estado del pedido basado en los estados de sus items
   * Lógica: 
   * - Si todos los items están completados/servidos → pedido completado
   * - Si todos los items están servidos → pedido servido
   * - Si todos los items están listos → pedido listo
   * - Si al menos uno está preparando → pedido preparando
   * - Si todos están confirmados → pedido confirmado
   * - Si todos están pendientes → pedido pendiente
   */
  private calcularEstadoPedidoDesdeItems(items: ItemPedidoConDetalles[]): EstadoPedido | null {
    if (!items || items.length === 0) {
      return null;
    }

    const estados = items.map(item => item.estado);
    const estadosUnicos = [...new Set(estados)];

    // Si todos están completados o servidos
    if (estadosUnicos.every(e => e === 'completado' || e === 'servido')) {
      if (estadosUnicos.every(e => e === 'completado')) {
        return EstadoPedido.COMPLETADO;
      }
      return EstadoPedido.SERVIDO;
    }

    // Si todos están servidos
    if (estadosUnicos.length === 1 && estadosUnicos[0] === 'servido') {
      return EstadoPedido.SERVIDO;
    }

    // Si todos están listos
    if (estadosUnicos.length === 1 && estadosUnicos[0] === 'listo') {
      return EstadoPedido.LISTO;
    }

    // Si al menos uno está preparando
    if (estados.includes('preparando')) {
      return EstadoPedido.PREPARANDO;
    }

    // Si todos están confirmados
    if (estadosUnicos.length === 1 && estadosUnicos[0] === 'confirmado') {
      return EstadoPedido.CONFIRMADO;
    }

    // Si todos están pendientes
    if (estadosUnicos.length === 1 && estadosUnicos[0] === 'pendiente') {
      return EstadoPedido.PENDIENTE;
    }

    // Estado mixto - mantener el estado actual del pedido
    return null;
  }

  /**
   * Actualiza el estado de un item individual del pedido
   */
  async actualizarEstadoItem(
    itemPedidoId: string,
    nuevoEstado: string,
    usuarioId?: string,
    notas?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<PedidoCompleto> {
    this.logOperation(`actualizar estado de item: ${itemPedidoId}`, { usuarioId, nuevoEstado });

    // Obtener el item del pedido
    const itemResult = await AppDataSource.query(
      `SELECT ip.id, ip.pedido_id, ip.estado, p.restaurante_id, p.estado as pedido_estado
       FROM items_pedido ip
       INNER JOIN pedidos p ON ip.pedido_id = p.id
       WHERE ip.id = @0`,
      [itemPedidoId]
    );

    if (!itemResult || itemResult.length === 0) {
      this.handleError('Item del pedido no encontrado', null, 404);
    }

    const item = itemResult[0];
    const estadoAnterior = item.estado;
    const pedidoId = item.pedido_id;

    // Validar transición de estado
    const estadosValidos = ['pendiente', 'preparando', 'listo', 'servido', 'cancelado'];
    if (!estadosValidos.includes(nuevoEstado)) {
      this.handleError(`Estado inválido para item: ${nuevoEstado}`, null, 400);
    }

    if (estadoAnterior === nuevoEstado) {
      // No hay cambio, retornar el pedido actualizado
      const pedidoActual = await this.obtenerPorId(pedidoId);
      if (!pedidoActual) {
        this.handleError('Error al obtener el pedido', null, 500);
      }
      return pedidoActual;
    }

    // Actualizar estado del item
    const fechaActual = getMonteriaLocalDate();
    await AppDataSource.query(
      `UPDATE items_pedido 
       SET estado = @0, fecha_actualizacion = @1
       WHERE id = @2`,
      [nuevoEstado, fechaActual, itemPedidoId]
    );

    // Registrar en historial con item_pedido_id
    await AppDataSource.query(
      `INSERT INTO historial_estado_pedido (pedido_id, item_pedido_id, estado_anterior, estado_nuevo, cambiado_por_id, notas, fecha_creacion)
       VALUES (@0, @1, @2, @3, @4, @5, @6)`,
      [pedidoId, itemPedidoId, estadoAnterior, nuevoEstado, usuarioId || null, notas || null, fechaActual]
    );

    // Obtener todos los items del pedido para calcular el estado del pedido
    const items = await this.obtenerItemsDePedido(pedidoId);
    const nuevoEstadoPedido = this.calcularEstadoPedidoDesdeItems(items);

    // Si se calculó un nuevo estado para el pedido, actualizarlo
    if (nuevoEstadoPedido && nuevoEstadoPedido !== item.pedido_estado) {
      await this.actualizar(pedidoId, { estado: nuevoEstadoPedido }, usuarioId, requestInfo);
    }

    // Obtener pedido actualizado
    const pedidoActualizado = await this.obtenerPorId(pedidoId);
    if (!pedidoActualizado) {
      this.handleError('Error al obtener el pedido actualizado', null, 500);
    }

    this.logger.info('Estado de item actualizado exitosamente', {
      categoria: this.logCategory,
      restauranteId: item.restaurante_id,
      usuarioId: usuarioId,
      entidadTipo: 'item_pedido',
      entidadId: itemPedidoId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        itemPedidoId,
        pedidoId,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        nuevoEstadoPedido: nuevoEstadoPedido || item.pedido_estado,
      },
      metadata: {
        tipoOperacion: 'actualizar_estado_item',
        timestamp: new Date().toISOString(),
      },
    });

    // Emitir evento WebSocket de item actualizado
    if (pedidoActualizado) {
      // Obtener el item actualizado
      const items = pedidoActualizado.items || [];
      const itemActualizado = items.find(i => i.id === itemPedidoId);
      
      if (itemActualizado) {
        await webSocketService.emitItemPedidoActualizado({
          pedido: pedidoActualizado,
          item: itemActualizado,
          restauranteId: pedidoActualizado.restauranteId,
          meseroAsignadoId: pedidoActualizado.meseroAsignadoId || undefined,
        });
      }
    }

    return pedidoActualizado;
  }

  /**
   * Cambia el estado de un pedido
   */
  async cambiarEstado(
    pedidoId: string,
    nuevoEstado: EstadoPedido,
    usuarioId?: string,
    notas?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<PedidoCompleto> {
    return this.actualizar(pedidoId, { estado: nuevoEstado }, usuarioId, requestInfo);
  }

  /**
   * Confirma un pedido pendiente de confirmación (cambia de pendiente_confirmacion a confirmado)
   */
  async confirmarPedido(
    pedidoId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<PedidoCompleto> {
    this.logOperation(`confirmar pedido: ${pedidoId}`, { usuarioId });

    const pedido = await this.obtenerPorId(pedidoId);
    if (!pedido) {
      this.handleError('Pedido no encontrado', null, 404);
    }

    // Verificar que el pedido esté en estado pendiente_confirmacion
    if (pedido!.estado !== EstadoPedido.PENDIENTE_CONFIRMACION) {
      this.handleError(
        `El pedido no está pendiente de confirmación. Estado actual: ${pedido!.estado}`,
        null,
        400
      );
    }

    // Cambiar estado a confirmado
    return this.cambiarEstado(pedidoId, EstadoPedido.CONFIRMADO, usuarioId, undefined, requestInfo);
  }

  /**
   * Obtiene el historial de cambios de estado de un pedido
   */
  async obtenerHistorial(pedidoId: string): Promise<any[]> {
    this.logOperation(`obtener historial de pedido: ${pedidoId}`);

    const historial = await AppDataSource.query(`
      SELECT 
        h.id,
        h.pedido_id,
        h.item_pedido_id,
        h.estado_anterior,
        h.estado_nuevo,
        h.cambiado_por_id,
        h.notas,
        h.fecha_creacion,
        u.nombre + ' ' + u.apellido as usuario_nombre,
        u.correo as usuario_email,
        r.nombre as rol_nombre,
        im.nombre as item_menu_nombre
      FROM historial_estado_pedido h
      LEFT JOIN usuarios u ON h.cambiado_por_id = u.id
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ru.rol_id
      LEFT JOIN items_pedido ip ON h.item_pedido_id = ip.id
      LEFT JOIN items_menu im ON ip.item_menu_id = im.id
      WHERE h.pedido_id = @0
      ORDER BY h.fecha_creacion DESC
    `, [pedidoId]);

    return historial.map((h: any) => ({
      id: h.id,
      pedidoId: h.pedido_id,
      itemPedidoId: h.item_pedido_id || null,
      estadoAnterior: h.estado_anterior || null,
      estadoNuevo: h.estado_nuevo,
      cambiadoPorId: h.cambiado_por_id || null,
      usuarioNombre: h.usuario_nombre || null,
      usuarioEmail: h.usuario_email || null,
      rolNombre: h.rol_nombre || null,
      itemMenuNombre: h.item_menu_nombre || null,
      notas: h.notas || null,
      fechaCreacion: h.fecha_creacion,
    }));
  }

  /**
   * Elimina un pedido (solo si está cancelado o completado)
   */
  async eliminar(
    pedidoId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar pedido: ${pedidoId}`, { usuarioId });

    const pedido = await this.obtenerPorId(pedidoId);
    if (!pedido) {
      this.handleError('Pedido no encontrado', null, 404);
    }

    // Solo se pueden eliminar pedidos cancelados o completados
    if (pedido!.estado !== EstadoPedido.CANCELADO && pedido!.estado !== EstadoPedido.COMPLETADO) {
      this.handleError(
        `No se puede eliminar el pedido porque está en estado "${pedido!.estado}". Solo se pueden eliminar pedidos cancelados o completados.`,
        null,
        400
      );
    }

    // Eliminar items del pedido (cascade delete)
    await AppDataSource.query(`DELETE FROM pedidos WHERE id = @0`, [pedidoId]);

    this.logger.info('Pedido eliminado exitosamente', {
      categoria: this.logCategory,
      restauranteId: pedido!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'pedido',
      entidadId: pedidoId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: pedidoId,
        restauranteId: pedido!.restauranteId,
        estado: pedido!.estado,
        montoTotal: pedido!.montoTotal,
      },
      metadata: {
        tipoOperacion: 'eliminar_pedido',
        tipoEliminacion: 'hard_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

