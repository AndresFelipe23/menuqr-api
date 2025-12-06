import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { Logger, LogCategory } from '../utils/logger';
import { CrearMesaDto, ActualizarMesaDto, QueryMesaDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { webSocketService } from './websocket.service';
import { StorageService } from './storage.service';
import QRCode from 'qrcode';

export interface Mesa {
  id: string;
  restauranteId: string;
  numero: string;
  nombre: string | null;
  codigoQr: string | null;
  imagenQrUrl: string | null;
  capacidad: number;
  activa: boolean;
  ocupada: boolean;
  seccion: string | null;
  piso: number;
  meseroAsignadoId: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface MesaConMesero extends Mesa {
  meseroNombre?: string | null;
  meseroEmail?: string | null;
}

export interface PaginatedMesas {
  items: MesaConMesero[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class MesasService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;
  private storageService = new StorageService();

  /**
   * Genera la imagen QR y la sube a Firebase Storage
   */
  private async generarImagenQR(codigoQr: string, restauranteId: string, mesaId: string): Promise<string | null> {
    try {
      // Generar el QR como buffer
      const qrBuffer = await QRCode.toBuffer(codigoQr, {
        errorCorrectionLevel: 'M',
        type: 'png',
        width: 500,
        margin: 2,
      });

      // Subir la imagen a Firebase Storage
      const uploadResult = await this.storageService.uploadFile(
        {
          originalname: `qr-mesa-${mesaId}.png`,
          buffer: qrBuffer,
          mimetype: 'image/png',
          size: qrBuffer.length,
        },
        restauranteId,
        'qrs', // Subcarpeta para códigos QR
        true // Hacer público
      );

      return uploadResult.url;
    } catch (error: any) {
      Logger.error('Error al generar imagen QR', error instanceof Error ? error : new Error(String(error)), {
        categoria: this.logCategory,
        detalle: { codigoQr, restauranteId, mesaId },
      });
      // No fallar si no se puede generar el QR, solo retornar null
      return null;
    }
  }

  /**
   * Convierte un resultado de base de datos a la interfaz Mesa
   */
  private mapToMesa(row: any): Mesa {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      numero: row.numero,
      nombre: row.nombre,
      codigoQr: row.codigo_qr,
      imagenQrUrl: row.imagen_qr_url,
      capacidad: row.capacidad || 4,
      activa: row.activa === 1 || row.activa === true,
      ocupada: row.ocupada === 1 || row.ocupada === true,
      seccion: row.seccion,
      piso: row.piso || 1,
      meseroAsignadoId: row.mesero_asignado_id,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene todas las mesas con paginación y filtros
   */
  async obtenerTodos(query: QueryMesaDto): Promise<PaginatedMesas> {
    this.logOperation('obtener todas las mesas', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = [];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`m.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.numero) {
      condiciones.push(`m.numero LIKE @${indice}`);
      parametros.push(`%${query.numero}%`);
      indice++;
    }

    if (query.seccion) {
      condiciones.push(`m.seccion = @${indice}`);
      parametros.push(query.seccion);
      indice++;
    }

    if (query.activa !== undefined) {
      condiciones.push(`m.activa = @${indice}`);
      parametros.push(query.activa ? 1 : 0);
      indice++;
    }

    if (query.ocupada !== undefined) {
      condiciones.push(`m.ocupada = @${indice}`);
      parametros.push(query.ocupada ? 1 : 0);
      indice++;
    }

    if (query.meseroAsignadoId) {
      condiciones.push(`m.mesero_asignado_id = @${indice}`);
      parametros.push(query.meseroAsignadoId);
      indice++;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM mesas m
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';

    // Obtener mesas con información del mesero
    const mesas = await AppDataSource.query(`
      SELECT 
        m.id, m.restaurante_id, m.numero, m.nombre,
        m.codigo_qr, m.imagen_qr_url, m.capacidad, m.activa, m.ocupada,
        m.seccion, m.piso, m.mesero_asignado_id,
        m.fecha_creacion, m.fecha_actualizacion,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM mesas m
      LEFT JOIN usuarios u ON m.mesero_asignado_id = u.id
      ${whereClause}
      ORDER BY m.numero ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    return {
      items: mesas.map((m: any) => ({
        ...this.mapToMesa(m),
        meseroNombre: m.mesero_nombre,
        meseroEmail: m.mesero_email,
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
   * Obtiene una mesa por ID
   */
  async obtenerPorId(mesaId: string): Promise<MesaConMesero | null> {
    this.logOperation(`obtener mesa por ID: ${mesaId}`);

    const mesas = await AppDataSource.query(`
      SELECT 
        m.id, m.restaurante_id, m.numero, m.nombre,
        m.codigo_qr, m.imagen_qr_url, m.capacidad, m.activa, m.ocupada,
        m.seccion, m.piso, m.mesero_asignado_id,
        m.fecha_creacion, m.fecha_actualizacion,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM mesas m
      LEFT JOIN usuarios u ON m.mesero_asignado_id = u.id
      WHERE m.id = @0
    `, [mesaId]);

    if (!mesas || mesas.length === 0) {
      return null;
    }

    const m = mesas[0];
    return {
      ...this.mapToMesa(m),
      meseroNombre: m.mesero_nombre,
      meseroEmail: m.mesero_email,
    };
  }

  /**
   * Obtiene todas las mesas de un restaurante específico
   * @param restauranteId - ID del restaurante
   * @param soloActivas - Si es true, solo devuelve mesas activas (para rutas públicas)
   */
  async obtenerPorRestauranteId(restauranteId: string, soloActivas: boolean = false): Promise<MesaConMesero[]> {
    this.logOperation(`obtener mesas por restauranteId: ${restauranteId}`, { soloActivas });

    let query = `
      SELECT 
        m.id, m.restaurante_id, m.numero, m.nombre,
        m.codigo_qr, m.imagen_qr_url, m.capacidad, m.activa, m.ocupada,
        m.seccion, m.piso, m.mesero_asignado_id,
        m.fecha_creacion, m.fecha_actualizacion,
        u.nombre + ' ' + u.apellido as mesero_nombre,
        u.correo as mesero_email
      FROM mesas m
      LEFT JOIN usuarios u ON m.mesero_asignado_id = u.id
      WHERE m.restaurante_id = @0
    `;
    
    if (soloActivas) {
      query += ' AND m.activa = 1';
    }
    
    query += ' ORDER BY m.numero ASC';

    const mesas = await AppDataSource.query(query, [restauranteId]);

    return mesas.map((m: any) => ({
      ...this.mapToMesa(m),
      meseroNombre: m.mesero_nombre,
      meseroEmail: m.mesero_email,
    }));
  }

  /**
   * Crea una nueva mesa
   */
  async crear(
    crearMesaDto: CrearMesaDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Mesa> {
    this.logOperation('crear mesa', { data: crearMesaDto, usuarioId });

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearMesaDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar límites de suscripción
    try {
      const { SuscripcionesService } = await import('./suscripciones.service');
      const suscripcionesService = new SuscripcionesService();
      const limites = await suscripcionesService.verificarLimites(crearMesaDto.restauranteId, 'mesas');
      
      if (!limites.permitido) {
        const mensaje = limites.limite === -1 
          ? 'No se puede crear más mesas. Por favor, actualiza tu plan para obtener límites ilimitados.'
          : `Has alcanzado el límite de ${limites.limite} mesas de tu plan actual (${limites.actual}/${limites.limite}). ` +
            'Por favor, actualiza tu plan para crear más mesas.';
        this.handleError(mensaje, null, 403);
      }
    } catch (error: any) {
      // Si hay error al verificar límites, continuar (no bloquear)
      Logger.warn('Error al verificar límites de suscripción', {
        categoria: this.logCategory,
        restauranteId: crearMesaDto.restauranteId,
        detalle: { error: error.message },
      });
    }

    // Verificar que el número de mesa no esté duplicado en el restaurante
    const mesaExistente = await AppDataSource.query(
      `SELECT id FROM mesas WHERE restaurante_id = @0 AND numero = @1`,
      [crearMesaDto.restauranteId, crearMesaDto.numero]
    );

    if (mesaExistente && mesaExistente.length > 0) {
      this.handleError('Ya existe una mesa con ese número en este restaurante', null, 409);
    }

    // Verificar que el mesero existe si se proporciona
    if (crearMesaDto.meseroAsignadoId) {
      const mesero = await AppDataSource.query(
        `SELECT id FROM usuarios WHERE id = @0 AND restaurante_id = @1`,
        [crearMesaDto.meseroAsignadoId, crearMesaDto.restauranteId]
      );

      if (!mesero || mesero.length === 0) {
        this.handleError('Mesero no encontrado o no pertenece a este restaurante', null, 404);
      }
    }

    // Obtener fecha actual en hora local de Montería
    const fechaActual = getMonteriaLocalDate();

    // Obtener el slug del restaurante para generar el link del QR
    const restauranteInfo = await AppDataSource.query(
      `SELECT slug FROM restaurantes WHERE id = @0`,
      [crearMesaDto.restauranteId]
    );

    if (!restauranteInfo || restauranteInfo.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    const slugRestaurante = restauranteInfo[0].slug;
    const frontendClienteUrl = process.env.FRONTEND_CLIENTE_URL || 'http://localhost:4321';

    // Crear la mesa primero (necesitamos el ID para generar el QR)
    const resultado = await AppDataSource.query(`
      INSERT INTO mesas (
        restaurante_id, numero, nombre, codigo_qr, imagen_qr_url,
        capacidad, activa, ocupada, seccion, piso, mesero_asignado_id,
        fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.id, INSERTED.restaurante_id, INSERTED.numero, INSERTED.nombre,
        INSERTED.codigo_qr, INSERTED.imagen_qr_url, INSERTED.capacidad, INSERTED.activa, INSERTED.ocupada,
        INSERTED.seccion, INSERTED.piso, INSERTED.mesero_asignado_id,
        INSERTED.fecha_creacion, INSERTED.fecha_actualizacion
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @11
      )
    `, [
      crearMesaDto.restauranteId,
      crearMesaDto.numero,
      crearMesaDto.nombre || null,
      null, // codigo_qr se actualizará después con el ID real
      crearMesaDto.imagenQrUrl || null,
      crearMesaDto.capacidad || 4,
      crearMesaDto.activa !== undefined ? (crearMesaDto.activa ? 1 : 0) : 1,
      crearMesaDto.ocupada !== undefined ? (crearMesaDto.ocupada ? 1 : 0) : 0,
      crearMesaDto.seccion || null,
      crearMesaDto.piso || 1,
      crearMesaDto.meseroAsignadoId || null,
      fechaActual, // fecha_creacion en hora local de Montería
      fechaActual, // fecha_actualizacion en hora local de Montería
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear la mesa', null, 500);
    }

    const nuevaMesa = resultado[0];
    
    // Generar el código QR automáticamente con el ID real de la mesa
    const codigoQrGenerado = crearMesaDto.codigoQr || `${frontendClienteUrl}/${slugRestaurante}/m/${nuevaMesa.id}`;
    
    // Generar la imagen QR automáticamente si no se proporcionó una URL manual
    let imagenQrUrl = crearMesaDto.imagenQrUrl || null;
    if (!imagenQrUrl) {
      imagenQrUrl = await this.generarImagenQR(codigoQrGenerado, crearMesaDto.restauranteId, nuevaMesa.id);
    }
    
    // Actualizar el código QR y la imagen QR con el link completo
    await AppDataSource.query(
      `UPDATE mesas SET codigo_qr = @0, imagen_qr_url = @1 WHERE id = @2`,
      [codigoQrGenerado, imagenQrUrl, nuevaMesa.id]
    );
    
    // Obtener la mesa actualizada
    const mesaActualizada = await AppDataSource.query(
      `SELECT * FROM mesas WHERE id = @0`,
      [nuevaMesa.id]
    );
    
    const mesaMapeada = this.mapToMesa(mesaActualizada[0]);

    this.logger.info('Mesa creada exitosamente', {
      categoria: this.logCategory,
      restauranteId: crearMesaDto.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'mesa',
      entidadId: mesaMapeada.id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 201,
      detalle: {
        id: mesaMapeada.id,
        restauranteId: mesaMapeada.restauranteId,
        numero: mesaMapeada.numero,
        capacidad: mesaMapeada.capacidad,
        activa: mesaMapeada.activa,
        ocupada: mesaMapeada.ocupada,
      },
      metadata: {
        tipoOperacion: 'crear_mesa',
        camposProporcionados: Object.keys(crearMesaDto),
        timestamp: new Date().toISOString(),
      },
    });

    // Emitir evento WebSocket de mesa creada
    await webSocketService.emitMesaActualizada({
      mesa: mesaMapeada,
      restauranteId: mesaMapeada.restauranteId,
      meseroAsignadoId: mesaMapeada.meseroAsignadoId || undefined,
    });

    return mesaMapeada;
  }

  /**
   * Actualiza una mesa
   */
  async actualizar(
    mesaId: string,
    actualizarMesaDto: ActualizarMesaDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Mesa> {
    this.logOperation(`actualizar mesa: ${mesaId}`, { data: actualizarMesaDto, usuarioId });

    const mesa = await this.obtenerPorId(mesaId);
    if (!mesa) {
      this.handleError('Mesa no encontrada', null, 404);
    }

    // Si se está actualizando el número, verificar que no esté duplicado
    if (actualizarMesaDto.numero && actualizarMesaDto.numero !== mesa!.numero) {
      const mesaExistente = await AppDataSource.query(
        `SELECT id FROM mesas WHERE restaurante_id = @0 AND numero = @1 AND id != @2`,
        [mesa!.restauranteId, actualizarMesaDto.numero, mesaId]
      );

      if (mesaExistente && mesaExistente.length > 0) {
        this.handleError('Ya existe otra mesa con ese número en este restaurante', null, 409);
      }
    }

    // Verificar que el mesero existe si se proporciona
    if (actualizarMesaDto.meseroAsignadoId !== undefined && actualizarMesaDto.meseroAsignadoId !== null) {
      const mesero = await AppDataSource.query(
        `SELECT id FROM usuarios WHERE id = @0 AND restaurante_id = @1`,
        [actualizarMesaDto.meseroAsignadoId, mesa!.restauranteId]
      );

      if (!mesero || mesero.length === 0) {
        this.handleError('Mesero no encontrado o no pertenece a este restaurante', null, 404);
      }
    }

    // Construir la consulta UPDATE dinámicamente
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    if (actualizarMesaDto.numero !== undefined) {
      campos.push(`numero = @${indice}`);
      valores.push(actualizarMesaDto.numero);
      indice++;
    }

    if (actualizarMesaDto.nombre !== undefined) {
      campos.push(`nombre = @${indice}`);
      valores.push(actualizarMesaDto.nombre);
      indice++;
    }

    if (actualizarMesaDto.codigoQr !== undefined) {
      campos.push(`codigo_qr = @${indice}`);
      valores.push(actualizarMesaDto.codigoQr);
      indice++;
    }

    if (actualizarMesaDto.imagenQrUrl !== undefined) {
      campos.push(`imagen_qr_url = @${indice}`);
      valores.push(actualizarMesaDto.imagenQrUrl);
      indice++;
    }

    if (actualizarMesaDto.capacidad !== undefined) {
      campos.push(`capacidad = @${indice}`);
      valores.push(actualizarMesaDto.capacidad);
      indice++;
    }

    if (actualizarMesaDto.seccion !== undefined) {
      campos.push(`seccion = @${indice}`);
      valores.push(actualizarMesaDto.seccion);
      indice++;
    }

    if (actualizarMesaDto.piso !== undefined) {
      campos.push(`piso = @${indice}`);
      valores.push(actualizarMesaDto.piso);
      indice++;
    }

    if (actualizarMesaDto.meseroAsignadoId !== undefined) {
      campos.push(`mesero_asignado_id = @${indice}`);
      valores.push(actualizarMesaDto.meseroAsignadoId);
      indice++;
    }

    if (actualizarMesaDto.activa !== undefined) {
      campos.push(`activa = @${indice}`);
      valores.push(actualizarMesaDto.activa ? 1 : 0);
      indice++;
    }

    if (actualizarMesaDto.ocupada !== undefined) {
      campos.push(`ocupada = @${indice}`);
      valores.push(actualizarMesaDto.ocupada ? 1 : 0);
      indice++;
    }

    if (campos.length === 0) {
      return mesa!;
    }

    // Agregar fecha_actualizacion en hora local de Montería
    const fechaActual = getMonteriaLocalDate();
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(fechaActual);
    indice++;

    valores.push(mesaId);

    await AppDataSource.query(`
      UPDATE mesas
      SET ${campos.join(', ')}
      WHERE id = @${indice}
    `, valores);

    const mesaActualizada = await this.obtenerPorId(mesaId) as MesaConMesero;

    // Preparar información de cambios
    const camposActualizados = Object.keys(actualizarMesaDto).filter(
      key => actualizarMesaDto[key as keyof ActualizarMesaDto] !== undefined
    );

    this.logger.info('Mesa actualizada exitosamente', {
      categoria: this.logCategory,
      restauranteId: mesaActualizada.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'mesa',
      entidadId: mesaId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: mesaActualizada.id,
        restauranteId: mesaActualizada.restauranteId,
        numero: mesaActualizada.numero,
        camposActualizados: camposActualizados,
        valoresAnteriores: mesa ? {
          numero: mesa.numero,
          nombre: mesa.nombre,
          capacidad: mesa.capacidad,
          activa: mesa.activa,
          ocupada: mesa.ocupada,
          seccion: mesa.seccion,
          piso: mesa.piso,
          meseroAsignadoId: mesa.meseroAsignadoId,
        } : null,
        valoresNuevos: actualizarMesaDto,
      },
      metadata: {
        tipoOperacion: 'actualizar_mesa',
        camposModificados: camposActualizados,
        cantidadCamposModificados: camposActualizados.length,
        timestamp: new Date().toISOString(),
      },
    });

    // Emitir evento WebSocket de mesa actualizada
    await webSocketService.emitMesaActualizada({
      mesa: mesaActualizada,
      restauranteId: mesaActualizada.restauranteId,
      meseroAsignadoId: mesaActualizada.meseroAsignadoId || undefined,
    });

    return mesaActualizada;
  }

  /**
   * Regenera el código QR y la imagen QR de una mesa
   */
  async regenerarQR(
    mesaId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Mesa> {
    this.logOperation(`regenerar QR de mesa: ${mesaId}`, { usuarioId });

    const mesa = await this.obtenerPorId(mesaId);
    if (!mesa) {
      this.handleError('Mesa no encontrada', null, 404);
    }

    // Obtener el slug del restaurante
    const restauranteInfo = await AppDataSource.query(
      `SELECT slug FROM restaurantes WHERE id = @0`,
      [mesa!.restauranteId]
    );

    if (!restauranteInfo || restauranteInfo.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    const slugRestaurante = restauranteInfo[0].slug;
    const frontendClienteUrl = process.env.FRONTEND_CLIENTE_URL || 'http://localhost:4321';

    // Generar el código QR
    const codigoQrGenerado = `${frontendClienteUrl}/${slugRestaurante}/m/${mesaId}`;

    // Generar la imagen QR
    const imagenQrUrl = await this.generarImagenQR(codigoQrGenerado, mesa!.restauranteId, mesaId);

    // Actualizar el código QR y la imagen QR
    await AppDataSource.query(
      `UPDATE mesas SET codigo_qr = @0, imagen_qr_url = @1, fecha_actualizacion = @2 WHERE id = @3`,
      [codigoQrGenerado, imagenQrUrl, getMonteriaLocalDate(), mesaId]
    );

    // Obtener la mesa actualizada
    const mesaActualizada = await this.obtenerPorId(mesaId);
    if (!mesaActualizada) {
      this.handleError('Error al obtener la mesa actualizada', null, 500);
    }

    Logger.info('QR de mesa regenerado exitosamente', {
      categoria: this.logCategory,
      restauranteId: mesa!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'mesa',
      entidadId: mesaId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: mesaId,
        codigoQr: codigoQrGenerado,
        imagenQrUrl: imagenQrUrl,
      },
      metadata: {
        tipoOperacion: 'regenerar_qr_mesa',
        timestamp: new Date().toISOString(),
      },
    });

    // Emitir evento WebSocket de mesa actualizada
    await webSocketService.emitMesaActualizada({
      mesa: mesaActualizada!,
      restauranteId: mesaActualizada!.restauranteId,
      meseroAsignadoId: mesaActualizada!.meseroAsignadoId || undefined,
    });

    return mesaActualizada!;
  }

  /**
   * Elimina una mesa
   */
  async eliminar(
    mesaId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation(`eliminar mesa: ${mesaId}`, { usuarioId });

    const mesa = await this.obtenerPorId(mesaId);
    if (!mesa) {
      this.handleError('Mesa no encontrada', null, 404);
    }

    // Verificar que no tenga pedidos activos
    const pedidosActivos = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM pedidos
      WHERE mesa_id = @0 AND estado NOT IN ('completado', 'cancelado')
    `, [mesaId]);

    if (pedidosActivos && pedidosActivos[0] && pedidosActivos[0].total > 0) {
      this.handleError(
        `No se puede eliminar la mesa porque tiene ${pedidosActivos[0].total} pedido(s) activo(s)`,
        null,
        400
      );
    }

    await AppDataSource.query(`DELETE FROM mesas WHERE id = @0`, [mesaId]);

    this.logger.info('Mesa eliminada exitosamente', {
      categoria: this.logCategory,
      restauranteId: mesa!.restauranteId,
      usuarioId: usuarioId,
      entidadTipo: 'mesa',
      entidadId: mesaId,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      codigoEstadoHttp: 200,
      detalle: {
        id: mesaId,
        restauranteId: mesa!.restauranteId,
        numero: mesa!.numero,
        capacidad: mesa!.capacidad,
        activa: mesa!.activa,
        ocupada: mesa!.ocupada,
      },
      metadata: {
        tipoOperacion: 'eliminar_mesa',
        tipoEliminacion: 'hard_delete',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

