import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { Logger, LogCategory } from '../utils/logger';
import { CrearReservaDto, ActualizarReservaDto, QueryReservaDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { SuscripcionesService } from './suscripciones.service';
import { AppError } from '../middlewares/errorHandler';
import crypto from 'crypto';

export interface Reserva {
  id: string;
  restauranteId: string;
  mesaId: string;
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  fechaReserva: Date;
  numeroPersonas: number;
  estado: string;
  codigoConfirmacion: string | null;
  notasCliente: string | null;
  notasInternas: string | null;
  meseroAsignadoId: string | null;
  confirmada: boolean;
  fechaConfirmacion: Date | null;
  confirmadaPorId: string | null;
  cancelada: boolean;
  fechaCancelacion: Date | null;
  canceladaPorId: string | null;
  motivoCancelacion: string | null;
  fechaLlegada: Date | null;
  fechaSalida: Date | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface ReservaConDetalles extends Reserva {
  mesaNumero?: string | null;
  mesaNombre?: string | null;
  meseroNombre?: string | null;
  confirmadaPorNombre?: string | null;
  canceladaPorNombre?: string | null;
}

export interface PaginatedReservas {
  items: ReservaConDetalles[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ReservasService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Verifica que el restaurante tenga plan PREMIUM
   */
  private async verificarPlanPremium(restauranteId: string): Promise<void> {
    const suscripcionesService = new SuscripcionesService();
    const suscripcion = await suscripcionesService.obtenerPorRestauranteId(restauranteId);

    if (!suscripcion) {
      this.handleError(
        'Las reservas solo están disponibles para usuarios con plan PREMIUM. Por favor, actualiza tu plan para acceder a esta funcionalidad.',
        null,
        403
      );
    }

    if (suscripcion.tipoPlan !== 'premium' || suscripcion.estado !== 'active') {
      this.handleError(
        'Las reservas solo están disponibles para usuarios con plan PREMIUM activo. Por favor, actualiza tu plan para acceder a esta funcionalidad.',
        null,
        403
      );
    }
  }

  /**
   * Genera un código de confirmación único
   */
  private generarCodigoConfirmacion(): string {
    // Genera un código de 8 caracteres alfanuméricos en mayúsculas
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Mapea un resultado de BD a la interfaz Reserva
   */
  private mapToReserva(row: any): Reserva {
    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      mesaId: row.mesa_id,
      nombreCliente: row.nombre_cliente,
      correoCliente: row.correo_cliente,
      telefonoCliente: row.telefono_cliente,
      fechaReserva: row.fecha_reserva,
      numeroPersonas: row.numero_personas || 2,
      estado: row.estado || 'pendiente',
      codigoConfirmacion: row.codigo_confirmacion,
      notasCliente: row.notas_cliente,
      notasInternas: row.notas_internas,
      meseroAsignadoId: row.mesero_asignado_id,
      confirmada: row.confirmada === 1 || row.confirmada === true,
      fechaConfirmacion: row.fecha_confirmacion,
      confirmadaPorId: row.confirmada_por_id,
      cancelada: row.cancelada === 1 || row.cancelada === true,
      fechaCancelacion: row.fecha_cancelacion,
      canceladaPorId: row.cancelada_por_id,
      motivoCancelacion: row.motivo_cancelacion,
      fechaLlegada: row.fecha_llegada,
      fechaSalida: row.fecha_salida,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene todas las reservas con paginación y filtros
   */
  async obtenerTodas(query: QueryReservaDto): Promise<PaginatedReservas> {
    this.logOperation('obtener todas las reservas', { query });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const condiciones: string[] = [];
    const parametros: any[] = [];
    let indice = 0;

    if (query.restauranteId) {
      condiciones.push(`r.restaurante_id = @${indice}`);
      parametros.push(query.restauranteId);
      indice++;
    }

    if (query.mesaId) {
      condiciones.push(`r.mesa_id = @${indice}`);
      parametros.push(query.mesaId);
      indice++;
    }

    if (query.estado) {
      condiciones.push(`r.estado = @${indice}`);
      parametros.push(query.estado);
      indice++;
    }

    if (query.correoCliente) {
      condiciones.push(`r.correo_cliente = @${indice}`);
      parametros.push(query.correoCliente);
      indice++;
    }

    if (query.telefonoCliente) {
      condiciones.push(`r.telefono_cliente = @${indice}`);
      parametros.push(query.telefonoCliente);
      indice++;
    }

    if (query.fechaDesde) {
      condiciones.push(`r.fecha_reserva >= @${indice}`);
      parametros.push(query.fechaDesde);
      indice++;
    }

    if (query.fechaHasta) {
      condiciones.push(`r.fecha_reserva <= @${indice}`);
      parametros.push(query.fechaHasta);
      indice++;
    }

    if (query.confirmada !== undefined) {
      condiciones.push(`r.confirmada = @${indice}`);
      parametros.push(query.confirmada ? 1 : 0);
      indice++;
    }

    if (query.cancelada !== undefined) {
      condiciones.push(`r.cancelada = @${indice}`);
      parametros.push(query.cancelada ? 1 : 0);
      indice++;
    }

    if (query.meseroAsignadoId) {
      condiciones.push(`r.mesero_asignado_id = @${indice}`);
      parametros.push(query.meseroAsignadoId);
      indice++;
    }

    // Solo mostrar reservas no eliminadas
    condiciones.push(`r.fecha_eliminacion IS NULL`);

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Contar total
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM reservas r
      ${whereClause}
    `, parametros);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Determinar orden
    const orden = query.orden === 'desc' ? 'DESC' : 'ASC';
    const ordenPor = query.ordenPor || 'fecha_reserva';
    const ordenPorMap: { [key: string]: string } = {
      fecha_creacion: 'r.fecha_creacion',
      fecha_reserva: 'r.fecha_reserva',
      estado: 'r.estado',
    };
    const ordenPorSql = ordenPorMap[ordenPor] || 'r.fecha_reserva';

    // Obtener reservas con información relacionada
    const reservas = await AppDataSource.query(`
      SELECT 
        r.id, r.restaurante_id, r.mesa_id, r.nombre_cliente, r.correo_cliente,
        r.telefono_cliente, r.fecha_reserva, r.numero_personas, r.estado,
        r.codigo_confirmacion, r.notas_cliente, r.notas_internas,
        r.mesero_asignado_id, r.confirmada, r.fecha_confirmacion, r.confirmada_por_id,
        r.cancelada, r.fecha_cancelacion, r.cancelada_por_id, r.motivo_cancelacion,
        r.fecha_llegada, r.fecha_salida, r.fecha_creacion, r.fecha_actualizacion,
        m.numero as mesa_numero, m.nombre as mesa_nombre,
        u1.nombre + ' ' + u1.apellido as mesero_nombre,
        u2.nombre + ' ' + u2.apellido as confirmada_por_nombre,
        u3.nombre + ' ' + u3.apellido as cancelada_por_nombre
      FROM reservas r
      LEFT JOIN mesas m ON r.mesa_id = m.id
      LEFT JOIN usuarios u1 ON r.mesero_asignado_id = u1.id
      LEFT JOIN usuarios u2 ON r.confirmada_por_id = u2.id
      LEFT JOIN usuarios u3 ON r.cancelada_por_id = u3.id
      ${whereClause}
      ORDER BY ${ordenPorSql} ${orden}
      OFFSET @${indice} ROWS
      FETCH NEXT @${indice + 1} ROWS ONLY
    `, parametros.concat([offset, limit]));

    return {
      items: reservas.map((r: any) => ({
        ...this.mapToReserva(r),
        mesaNumero: r.mesa_numero,
        mesaNombre: r.mesa_nombre,
        meseroNombre: r.mesero_nombre,
        confirmadaPorNombre: r.confirmada_por_nombre,
        canceladaPorNombre: r.cancelada_por_nombre,
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
   * Obtiene una reserva por ID
   */
  async obtenerPorId(reservaId: string): Promise<ReservaConDetalles | null> {
    this.logOperation(`obtener reserva por ID: ${reservaId}`);

    const reservas = await AppDataSource.query(`
      SELECT 
        r.id, r.restaurante_id, r.mesa_id, r.nombre_cliente, r.correo_cliente,
        r.telefono_cliente, r.fecha_reserva, r.numero_personas, r.estado,
        r.codigo_confirmacion, r.notas_cliente, r.notas_internas,
        r.mesero_asignado_id, r.confirmada, r.fecha_confirmacion, r.confirmada_por_id,
        r.cancelada, r.fecha_cancelacion, r.cancelada_por_id, r.motivo_cancelacion,
        r.fecha_llegada, r.fecha_salida, r.fecha_creacion, r.fecha_actualizacion,
        m.numero as mesa_numero, m.nombre as mesa_nombre,
        u1.nombre + ' ' + u1.apellido as mesero_nombre,
        u2.nombre + ' ' + u2.apellido as confirmada_por_nombre,
        u3.nombre + ' ' + u3.apellido as cancelada_por_nombre
      FROM reservas r
      LEFT JOIN mesas m ON r.mesa_id = m.id
      LEFT JOIN usuarios u1 ON r.mesero_asignado_id = u1.id
      LEFT JOIN usuarios u2 ON r.confirmada_por_id = u2.id
      LEFT JOIN usuarios u3 ON r.cancelada_por_id = u3.id
      WHERE r.id = @0 AND r.fecha_eliminacion IS NULL
    `, [reservaId]);

    if (!reservas || reservas.length === 0) {
      return null;
    }

    const r = reservas[0];
    return {
      ...this.mapToReserva(r),
      mesaNumero: r.mesa_numero,
      mesaNombre: r.mesa_nombre,
      meseroNombre: r.mesero_nombre,
      confirmadaPorNombre: r.confirmada_por_nombre,
      canceladaPorNombre: r.cancelada_por_nombre,
    };
  }

  /**
   * Crea una nueva reserva
   */
  async crear(
    crearReservaDto: CrearReservaDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Reserva> {
    this.logOperation('crear reserva', { data: crearReservaDto, usuarioId });

    // Verificar plan PREMIUM
    await this.verificarPlanPremium(crearReservaDto.restauranteId);

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [crearReservaDto.restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar que la mesa existe y pertenece al restaurante
    const mesa = await AppDataSource.query(
      `SELECT id, numero, nombre, restaurante_id, activa FROM mesas WHERE id = @0`,
      [crearReservaDto.mesaId]
    );

    if (!mesa || mesa.length === 0) {
      this.handleError('Mesa no encontrada', null, 404);
    }

    if (mesa[0].restaurante_id !== crearReservaDto.restauranteId) {
      this.handleError('La mesa no pertenece al restaurante especificado', null, 400);
    }

    if (mesa[0].activa === 0 || mesa[0].activa === false) {
      this.handleError('La mesa no está activa', null, 400);
    }

    // Verificar que la fecha de reserva sea futura
    const fechaReserva = new Date(crearReservaDto.fechaReserva);
    const fechaActual = new Date(getMonteriaLocalDate());

    if (fechaReserva <= fechaActual) {
      this.handleError('La fecha de reserva debe ser futura', null, 400);
    }

    // Verificar si ya existe una reserva activa para la misma mesa en la misma fecha y hora
    // Consideramos reservas activas: pendiente, confirmada, completada
    // No consideramos: cancelada, no_show, expirada
    const reservaExistente = await AppDataSource.query(`
      SELECT id, nombre_cliente, fecha_reserva, estado
      FROM reservas
      WHERE mesa_id = @0
        AND restaurante_id = @1
        AND fecha_eliminacion IS NULL
        AND estado NOT IN ('cancelada', 'no_show', 'expirada')
        AND CAST(fecha_reserva AS DATE) = CAST(@2 AS DATE)
        AND DATEPART(HOUR, fecha_reserva) = DATEPART(HOUR, @2)
        AND DATEPART(MINUTE, fecha_reserva) = DATEPART(MINUTE, @2)
    `, [
      crearReservaDto.mesaId,
      crearReservaDto.restauranteId,
      fechaReserva
    ]);

    if (reservaExistente && reservaExistente.length > 0) {
      const reserva = reservaExistente[0];
      const fechaReservaExistente = new Date(reserva.fecha_reserva);
      const fechaFormateada = fechaReservaExistente.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const horaFormateada = fechaReservaExistente.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      this.handleError(
        `Ya existe una reserva activa para esta mesa el ${fechaFormateada} a las ${horaFormateada} (Cliente: ${reserva.nombre_cliente}, Estado: ${reserva.estado})`,
        null,
        409
      );
    }

    // Generar código de confirmación único
    let codigoConfirmacion: string;
    let codigoUnico = false;
    let intentos = 0;
    const maxIntentos = 10;

    while (!codigoUnico && intentos < maxIntentos) {
      codigoConfirmacion = this.generarCodigoConfirmacion();
      const codigoExistente = await AppDataSource.query(
        `SELECT id FROM reservas WHERE codigo_confirmacion = @0`,
        [codigoConfirmacion]
      );

      if (!codigoExistente || codigoExistente.length === 0) {
        codigoUnico = true;
      }
      intentos++;
    }

    if (!codigoUnico) {
      this.handleError('Error al generar código de confirmación único', null, 500);
    }

    // Insertar reserva
    const fechaCreacion = getMonteriaLocalDate();
    const resultado = await AppDataSource.query(`
      INSERT INTO reservas (
        restaurante_id, mesa_id, nombre_cliente, correo_cliente, telefono_cliente,
        fecha_reserva, numero_personas, estado, codigo_confirmacion, notas_cliente,
        mesero_asignado_id, confirmada, cancelada, fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.*
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @12, @13, @14
      )
    `, [
      crearReservaDto.restauranteId,
      crearReservaDto.mesaId,
      crearReservaDto.nombreCliente,
      crearReservaDto.correoCliente,
      crearReservaDto.telefonoCliente,
      fechaReserva,
      crearReservaDto.numeroPersonas || 2,
      'pendiente',
      codigoConfirmacion!,
      crearReservaDto.notasCliente || null,
      crearReservaDto.meseroAsignadoId || null,
      0, // confirmada
      0, // cancelada
      fechaCreacion,
      fechaCreacion,
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear la reserva', null, 500);
    }

    const reserva = this.mapToReserva(resultado[0]);

    // Registrar en historial
    await this.registrarCambioEstado(reserva.id, null, 'pendiente', usuarioId || null, 'Reserva creada');

    // Log detallado de creación
    Logger.info('Reserva creada exitosamente', {
      categoria: this.logCategory,
      restauranteId: reserva.restauranteId,
      usuarioId: usuarioId || undefined,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      entidadTipo: 'reserva',
      entidadId: reserva.id,
      detalle: {
        accion: 'CREAR_RESERVA',
        reservaId: reserva.id,
        restauranteId: reserva.restauranteId,
        mesaId: reserva.mesaId,
        cliente: {
          nombre: reserva.nombreCliente,
          correo: reserva.correoCliente,
          telefono: reserva.telefonoCliente,
        },
        reserva: {
          fechaReserva: reserva.fechaReserva,
          numeroPersonas: reserva.numeroPersonas,
          estado: reserva.estado,
          codigoConfirmacion: reserva.codigoConfirmacion,
          notasCliente: reserva.notasCliente,
          meseroAsignadoId: reserva.meseroAsignadoId,
        },
        timestamp: new Date().toISOString(),
      },
    });

    return reserva;
  }

  /**
   * Actualiza una reserva
   */
  async actualizar(
    reservaId: string,
    actualizarReservaDto: ActualizarReservaDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<Reserva> {
    this.logOperation('actualizar reserva', { reservaId, data: actualizarReservaDto, usuarioId });

    // Verificar que la reserva existe
    const reservaExistente = await this.obtenerPorId(reservaId);
    if (!reservaExistente) {
      this.handleError('Reserva no encontrada', null, 404);
    }

    // Verificar plan PREMIUM
    await this.verificarPlanPremium(reservaExistente!.restauranteId);

    // Construir campos a actualizar
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;
    let estadoYaEstablecido = false; // Flag para evitar duplicación de estado

    if (actualizarReservaDto.mesaId !== undefined) {
      // Verificar que la nueva mesa existe y pertenece al restaurante
      const mesa = await AppDataSource.query(
        `SELECT id, restaurante_id, activa FROM mesas WHERE id = @0`,
        [actualizarReservaDto.mesaId]
      );

      if (!mesa || mesa.length === 0) {
        this.handleError('Mesa no encontrada', null, 404);
      }

      if (mesa[0].restaurante_id !== reservaExistente!.restauranteId) {
        this.handleError('La mesa no pertenece al restaurante', null, 400);
      }

      campos.push(`mesa_id = @${indice}`);
      valores.push(actualizarReservaDto.mesaId);
      indice++;
    }

    if (actualizarReservaDto.nombreCliente !== undefined) {
      campos.push(`nombre_cliente = @${indice}`);
      valores.push(actualizarReservaDto.nombreCliente);
      indice++;
    }

    if (actualizarReservaDto.correoCliente !== undefined) {
      campos.push(`correo_cliente = @${indice}`);
      valores.push(actualizarReservaDto.correoCliente);
      indice++;
    }

    if (actualizarReservaDto.telefonoCliente !== undefined) {
      campos.push(`telefono_cliente = @${indice}`);
      valores.push(actualizarReservaDto.telefonoCliente);
      indice++;
    }

    if (actualizarReservaDto.fechaReserva !== undefined) {
      const fechaReserva = new Date(actualizarReservaDto.fechaReserva);
      campos.push(`fecha_reserva = @${indice}`);
      valores.push(fechaReserva);
      indice++;
    }

    if (actualizarReservaDto.numeroPersonas !== undefined) {
      campos.push(`numero_personas = @${indice}`);
      valores.push(actualizarReservaDto.numeroPersonas);
      indice++;
    }

    if (actualizarReservaDto.estado !== undefined) {
      const estadoAnterior = reservaExistente!.estado;
      campos.push(`estado = @${indice}`);
      valores.push(actualizarReservaDto.estado);
      indice++;
      estadoYaEstablecido = true;

      // Registrar cambio de estado en historial
      await this.registrarCambioEstado(reservaId, estadoAnterior, actualizarReservaDto.estado, usuarioId || null);
    }

    if (actualizarReservaDto.notasCliente !== undefined) {
      campos.push(`notas_cliente = @${indice}`);
      valores.push(actualizarReservaDto.notasCliente);
      indice++;
    }

    if (actualizarReservaDto.notasInternas !== undefined) {
      campos.push(`notas_internas = @${indice}`);
      valores.push(actualizarReservaDto.notasInternas);
      indice++;
    }

    if (actualizarReservaDto.meseroAsignadoId !== undefined) {
      campos.push(`mesero_asignado_id = @${indice}`);
      valores.push(actualizarReservaDto.meseroAsignadoId);
      indice++;
    }

    if (actualizarReservaDto.confirmada !== undefined) {
      campos.push(`confirmada = @${indice}`);
      valores.push(actualizarReservaDto.confirmada ? 1 : 0);
      indice++;

      if (actualizarReservaDto.confirmada && !reservaExistente!.confirmada) {
        const fechaConfirmacion = getMonteriaLocalDate();
        campos.push(`fecha_confirmacion = @${indice}`);
        valores.push(fechaConfirmacion);
        indice++;

        if (usuarioId) {
          campos.push(`confirmada_por_id = @${indice}`);
          valores.push(usuarioId);
          indice++;
        }

        // Actualizar estado si está pendiente
        if (reservaExistente!.estado === 'pendiente') {
          campos.push(`estado = @${indice}`);
          valores.push('confirmada');
          indice++;

          await this.registrarCambioEstado(reservaId, 'pendiente', 'confirmada', usuarioId || null, 'Reserva confirmada');
        }

        // Log detallado de confirmación
        Logger.info('Reserva confirmada exitosamente', {
          categoria: this.logCategory,
          restauranteId: reservaExistente!.restauranteId,
          usuarioId: usuarioId || undefined,
          metodoHttp: requestInfo?.metodoHttp,
          ruta: requestInfo?.ruta,
          endpoint: requestInfo?.endpoint,
          direccionIp: requestInfo?.direccionIp,
          agenteUsuario: requestInfo?.agenteUsuario,
          entidadTipo: 'reserva',
          entidadId: reservaId,
          detalle: {
            accion: 'CONFIRMAR_RESERVA',
            reservaId: reservaId,
            restauranteId: reservaExistente!.restauranteId,
            estadoAnterior: reservaExistente!.estado,
            estadoNuevo: reservaExistente!.estado === 'pendiente' ? 'confirmada' : reservaExistente!.estado,
            confirmadaAnterior: reservaExistente!.confirmada,
            confirmadaNueva: true,
            fechaConfirmacion: fechaConfirmacion,
            reserva: {
              cliente: reservaExistente!.nombreCliente,
              correo: reservaExistente!.correoCliente,
              telefono: reservaExistente!.telefonoCliente,
              fechaReserva: reservaExistente!.fechaReserva,
              mesaId: reservaExistente!.mesaId,
              numeroPersonas: reservaExistente!.numeroPersonas,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    if (actualizarReservaDto.cancelada !== undefined) {
      campos.push(`cancelada = @${indice}`);
      valores.push(actualizarReservaDto.cancelada ? 1 : 0);
      indice++;

      if (actualizarReservaDto.cancelada && !reservaExistente!.cancelada) {
        // Cancelar reserva
        const fechaCancelacion = getMonteriaLocalDate();
        const motivoCancelacion = actualizarReservaDto.motivoCancelacion || 'Cancelada por el administrador';
        
        campos.push(`fecha_cancelacion = @${indice}`);
        valores.push(fechaCancelacion);
        indice++;

        if (usuarioId) {
          campos.push(`cancelada_por_id = @${indice}`);
          valores.push(usuarioId);
          indice++;
        }

        if (actualizarReservaDto.motivoCancelacion) {
          campos.push(`motivo_cancelacion = @${indice}`);
          valores.push(actualizarReservaDto.motivoCancelacion);
          indice++;
        }

        // Actualizar estado
        campos.push(`estado = @${indice}`);
        valores.push('cancelada');
        indice++;

        await this.registrarCambioEstado(reservaId, reservaExistente!.estado, 'cancelada', usuarioId || null, motivoCancelacion);

        // Log detallado de cancelación
        Logger.info('Reserva cancelada exitosamente', {
          categoria: this.logCategory,
          restauranteId: reservaExistente!.restauranteId,
          usuarioId: usuarioId || undefined,
          metodoHttp: requestInfo?.metodoHttp,
          ruta: requestInfo?.ruta,
          endpoint: requestInfo?.endpoint,
          direccionIp: requestInfo?.direccionIp,
          agenteUsuario: requestInfo?.agenteUsuario,
          entidadTipo: 'reserva',
          entidadId: reservaId,
          detalle: {
            accion: 'CANCELAR_RESERVA',
            reservaId: reservaId,
            restauranteId: reservaExistente!.restauranteId,
            estadoAnterior: reservaExistente!.estado,
            estadoNuevo: 'cancelada',
            canceladaAnterior: reservaExistente!.cancelada,
            canceladaNueva: true,
            fechaCancelacion: fechaCancelacion,
            motivoCancelacion: motivoCancelacion,
            reserva: {
              cliente: reservaExistente!.nombreCliente,
              correo: reservaExistente!.correoCliente,
              telefono: reservaExistente!.telefonoCliente,
              fechaReserva: reservaExistente!.fechaReserva,
              mesaId: reservaExistente!.mesaId,
              numeroPersonas: reservaExistente!.numeroPersonas,
              confirmada: reservaExistente!.confirmada,
            },
            timestamp: new Date().toISOString(),
          },
        });
      } else if (!actualizarReservaDto.cancelada && reservaExistente!.cancelada) {
        // Reactivar reserva cancelada
        const estadoAnterior = reservaExistente!.estado;
        const confirmadaAnterior = reservaExistente!.confirmada;
        
        campos.push(`fecha_cancelacion = @${indice}`);
        valores.push(null);
        indice++;

        campos.push(`cancelada_por_id = @${indice}`);
        valores.push(null);
        indice++;

        campos.push(`motivo_cancelacion = @${indice}`);
        valores.push(null);
        indice++;

        // Limpiar flag de confirmación para permitir confirmar nuevamente
        if (reservaExistente!.confirmada) {
          campos.push(`confirmada = @${indice}`);
          valores.push(0);
          indice++;

          campos.push(`fecha_confirmacion = @${indice}`);
          valores.push(null);
          indice++;

          campos.push(`confirmada_por_id = @${indice}`);
          valores.push(null);
          indice++;
        }

        // Restaurar estado a pendiente si estaba cancelada y no se estableció explícitamente en el DTO
        const estadoNuevo = estadoYaEstablecido ? actualizarReservaDto.estado : 'pendiente';
        if (reservaExistente!.estado === 'cancelada' && !estadoYaEstablecido) {
          campos.push(`estado = @${indice}`);
          valores.push('pendiente');
          indice++;

          await this.registrarCambioEstado(reservaId, 'cancelada', 'pendiente', usuarioId || null, 'Reserva reactivada');
        } else if (estadoYaEstablecido && reservaExistente!.estado === 'cancelada') {
          // Si el estado ya se estableció explícitamente en el DTO, solo registrar el cambio en historial si es necesario
          // (el cambio ya se registró arriba cuando se procesó actualizarReservaDto.estado)
        }

        // Log detallado de reactivación
        Logger.info('Reserva reactivada exitosamente', {
          categoria: this.logCategory,
          restauranteId: reservaExistente!.restauranteId,
          usuarioId: usuarioId || undefined,
          metodoHttp: requestInfo?.metodoHttp,
          ruta: requestInfo?.ruta,
          endpoint: requestInfo?.endpoint,
          direccionIp: requestInfo?.direccionIp,
          agenteUsuario: requestInfo?.agenteUsuario,
          entidadTipo: 'reserva',
          entidadId: reservaId,
          detalle: {
            accion: 'REACTIVAR_RESERVA',
            reservaId: reservaId,
            restauranteId: reservaExistente!.restauranteId,
            estadoAnterior: estadoAnterior,
            estadoNuevo: estadoNuevo,
            canceladaAnterior: reservaExistente!.cancelada,
            canceladaNueva: false,
            confirmadaAnterior: confirmadaAnterior,
            confirmadaNueva: false, // Se limpia al reactivar
            limpiarConfirmacion: confirmadaAnterior,
            reserva: {
              cliente: reservaExistente!.nombreCliente,
              correo: reservaExistente!.correoCliente,
              telefono: reservaExistente!.telefonoCliente,
              fechaReserva: reservaExistente!.fechaReserva,
              mesaId: reservaExistente!.mesaId,
              numeroPersonas: reservaExistente!.numeroPersonas,
              motivoCancelacionAnterior: reservaExistente!.motivoCancelacion,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    if (actualizarReservaDto.fechaLlegada !== undefined) {
      campos.push(`fecha_llegada = @${indice}`);
      valores.push(actualizarReservaDto.fechaLlegada ? new Date(actualizarReservaDto.fechaLlegada) : null);
      indice++;
    }

    if (actualizarReservaDto.fechaSalida !== undefined) {
      campos.push(`fecha_salida = @${indice}`);
      valores.push(actualizarReservaDto.fechaSalida ? new Date(actualizarReservaDto.fechaSalida) : null);
      indice++;
    }

    if (campos.length === 0) {
      return reservaExistente!;
    }

    // Actualizar fecha_actualizacion
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(getMonteriaLocalDate());
    indice++;

    valores.push(reservaId);

    const updateQuery = `
      UPDATE reservas
      SET ${campos.join(', ')}
      WHERE id = @${indice} AND fecha_eliminacion IS NULL
    `;

    await AppDataSource.query(updateQuery, valores);

    // Obtener la reserva actualizada
    const reserva = await this.obtenerPorId(reservaId);
    if (!reserva) {
      this.handleError('Error al actualizar la reserva', null, 500);
    }

    // Determinar el tipo de acción realizada
    let tipoAccion = 'EDITAR_RESERVA';
    if (actualizarReservaDto.confirmada !== undefined && actualizarReservaDto.confirmada && !reservaExistente!.confirmada) {
      tipoAccion = 'CONFIRMAR_RESERVA'; // Ya se logueó arriba
    } else if (actualizarReservaDto.cancelada !== undefined && actualizarReservaDto.cancelada && !reservaExistente!.cancelada) {
      tipoAccion = 'CANCELAR_RESERVA'; // Ya se logueó arriba
    } else if (actualizarReservaDto.cancelada !== undefined && !actualizarReservaDto.cancelada && reservaExistente!.cancelada) {
      tipoAccion = 'REACTIVAR_RESERVA'; // Ya se logueó arriba
    } else {
      // Log detallado de edición general
      const cambios: any = {};
      if (actualizarReservaDto.mesaId !== undefined && actualizarReservaDto.mesaId !== reservaExistente!.mesaId) {
        cambios.mesaId = { anterior: reservaExistente!.mesaId, nuevo: actualizarReservaDto.mesaId };
      }
      if (actualizarReservaDto.nombreCliente !== undefined && actualizarReservaDto.nombreCliente !== reservaExistente!.nombreCliente) {
        cambios.nombreCliente = { anterior: reservaExistente!.nombreCliente, nuevo: actualizarReservaDto.nombreCliente };
      }
      if (actualizarReservaDto.correoCliente !== undefined && actualizarReservaDto.correoCliente !== reservaExistente!.correoCliente) {
        cambios.correoCliente = { anterior: reservaExistente!.correoCliente, nuevo: actualizarReservaDto.correoCliente };
      }
      if (actualizarReservaDto.telefonoCliente !== undefined && actualizarReservaDto.telefonoCliente !== reservaExistente!.telefonoCliente) {
        cambios.telefonoCliente = { anterior: reservaExistente!.telefonoCliente, nuevo: actualizarReservaDto.telefonoCliente };
      }
      if (actualizarReservaDto.fechaReserva !== undefined) {
        cambios.fechaReserva = { anterior: reservaExistente!.fechaReserva, nuevo: actualizarReservaDto.fechaReserva };
      }
      if (actualizarReservaDto.numeroPersonas !== undefined && actualizarReservaDto.numeroPersonas !== reservaExistente!.numeroPersonas) {
        cambios.numeroPersonas = { anterior: reservaExistente!.numeroPersonas, nuevo: actualizarReservaDto.numeroPersonas };
      }
      if (actualizarReservaDto.notasCliente !== undefined && actualizarReservaDto.notasCliente !== reservaExistente!.notasCliente) {
        cambios.notasCliente = { anterior: reservaExistente!.notasCliente, nuevo: actualizarReservaDto.notasCliente };
      }
      if (actualizarReservaDto.meseroAsignadoId !== undefined && actualizarReservaDto.meseroAsignadoId !== reservaExistente!.meseroAsignadoId) {
        cambios.meseroAsignadoId = { anterior: reservaExistente!.meseroAsignadoId, nuevo: actualizarReservaDto.meseroAsignadoId };
      }

      if (Object.keys(cambios).length > 0) {
        Logger.info('Reserva editada exitosamente', {
          categoria: this.logCategory,
          restauranteId: reservaExistente!.restauranteId,
          usuarioId: usuarioId || undefined,
          metodoHttp: requestInfo?.metodoHttp,
          ruta: requestInfo?.ruta,
          endpoint: requestInfo?.endpoint,
          direccionIp: requestInfo?.direccionIp,
          agenteUsuario: requestInfo?.agenteUsuario,
          entidadTipo: 'reserva',
          entidadId: reservaId,
          detalle: {
            accion: tipoAccion,
            reservaId: reservaId,
            restauranteId: reservaExistente!.restauranteId,
            cambios: cambios,
            datosAnteriores: {
              cliente: reservaExistente!.nombreCliente,
              correo: reservaExistente!.correoCliente,
              telefono: reservaExistente!.telefonoCliente,
              fechaReserva: reservaExistente!.fechaReserva,
              mesaId: reservaExistente!.mesaId,
              numeroPersonas: reservaExistente!.numeroPersonas,
              estado: reservaExistente!.estado,
              meseroAsignadoId: reservaExistente!.meseroAsignadoId,
            },
            datosNuevos: {
              cliente: reserva!.nombreCliente,
              correo: reserva!.correoCliente,
              telefono: reserva!.telefonoCliente,
              fechaReserva: reserva!.fechaReserva,
              mesaId: reserva!.mesaId,
              numeroPersonas: reserva!.numeroPersonas,
              estado: reserva!.estado,
              meseroAsignadoId: reserva!.meseroAsignadoId,
            },
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    return reserva!;
  }

  /**
   * Elimina una reserva (soft delete)
   */
  async eliminar(
    reservaId: string,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<void> {
    this.logOperation('eliminar reserva', { reservaId, usuarioId });

    // Verificar que la reserva existe
    const reserva = await this.obtenerPorId(reservaId);
    if (!reserva) {
      this.handleError('Reserva no encontrada', null, 404);
    }

    // Verificar plan PREMIUM
    await this.verificarPlanPremium(reserva!.restauranteId);

    // Soft delete
    const fechaEliminacion = getMonteriaLocalDate();
    await AppDataSource.query(
      `UPDATE reservas SET fecha_eliminacion = @0 WHERE id = @1`,
      [fechaEliminacion, reservaId]
    );

    // Log detallado de eliminación
    Logger.info('Reserva eliminada exitosamente', {
      categoria: this.logCategory,
      restauranteId: reserva!.restauranteId,
      usuarioId: usuarioId || undefined,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      entidadTipo: 'reserva',
      entidadId: reservaId,
      detalle: {
        accion: 'ELIMINAR_RESERVA',
        reservaId: reservaId,
        restauranteId: reserva!.restauranteId,
        fechaEliminacion: fechaEliminacion,
        reserva: {
          cliente: reserva!.nombreCliente,
          correo: reserva!.correoCliente,
          telefono: reserva!.telefonoCliente,
          fechaReserva: reserva!.fechaReserva,
          mesaId: reserva!.mesaId,
          numeroPersonas: reserva!.numeroPersonas,
          estado: reserva!.estado,
          confirmada: reserva!.confirmada,
          cancelada: reserva!.cancelada,
          codigoConfirmacion: reserva!.codigoConfirmacion,
        },
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Registra un cambio de estado en el historial
   */
  private async registrarCambioEstado(
    reservaId: string,
    estadoAnterior: string | null,
    estadoNuevo: string,
    cambiadoPorId: string | null,
    notas?: string
  ): Promise<void> {
    await AppDataSource.query(`
      INSERT INTO historial_estado_reserva (reserva_id, estado_anterior, estado_nuevo, cambiado_por_id, notas)
      VALUES (@0, @1, @2, @3, @4)
    `, [reservaId, estadoAnterior, estadoNuevo, cambiadoPorId, notas || null]);
  }

  /**
   * Confirma una reserva por código
   */
  async confirmarPorCodigo(codigoConfirmacion: string): Promise<Reserva> {
    this.logOperation('confirmar reserva por código', { codigoConfirmacion });

    const reservas = await AppDataSource.query(
      `SELECT * FROM reservas WHERE codigo_confirmacion = @0 AND fecha_eliminacion IS NULL`,
      [codigoConfirmacion]
    );

    if (!reservas || reservas.length === 0) {
      this.handleError('Código de confirmación inválido', null, 404);
    }

    const reserva = this.mapToReserva(reservas[0]);

    if (reserva.confirmada) {
      this.handleError('La reserva ya está confirmada', null, 400);
    }

    if (reserva.cancelada) {
      this.handleError('La reserva está cancelada', null, 400);
    }

    // Confirmar reserva
    const fechaConfirmacion = getMonteriaLocalDate();
    await AppDataSource.query(`
      UPDATE reservas
      SET confirmada = 1, fecha_confirmacion = @0, estado = @1, fecha_actualizacion = @2
      WHERE id = @3
    `, [fechaConfirmacion, 'confirmada', fechaConfirmacion, reserva.id]);

    // Registrar en historial
    await this.registrarCambioEstado(reserva.id, reserva.estado, 'confirmada', null, 'Reserva confirmada por código');

    const reservaActualizada = await this.obtenerPorId(reserva.id);
    return reservaActualizada!;
  }
}

