import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { Logger, LogCategory } from '../utils/logger';
import { CrearConfiguracionReservasDto, ActualizarConfiguracionReservasDto } from '../dto';
import { getMonteriaLocalDate } from '../utils/date.utils';
import { SuscripcionesService } from './suscripciones.service';

export interface ConfiguracionReservas {
  id: string;
  restauranteId: string;
  reservasHabilitadas: boolean;
  horaAperturaLunes: string | null;
  horaCierreLunes: string | null;
  horaAperturaMartes: string | null;
  horaCierreMartes: string | null;
  horaAperturaMiercoles: string | null;
  horaCierreMiercoles: string | null;
  horaAperturaJueves: string | null;
  horaCierreJueves: string | null;
  horaAperturaViernes: string | null;
  horaCierreViernes: string | null;
  horaAperturaSabado: string | null;
  horaCierreSabado: string | null;
  horaAperturaDomingo: string | null;
  horaCierreDomingo: string | null;
  anticipacionMinimaHoras: number;
  anticipacionMaximaDias: number;
  duracionReservaMinutos: number;
  intervaloReservasMinutos: number;
  capacidadMaximaPersonas: number;
  capacidadMinimaPersonas: number;
  confirmacionAutomatica: boolean;
  requiereConfirmacionCliente: boolean;
  notificarReservaNueva: boolean;
  notificarCancelacion: boolean;
  notificarRecordatorio: boolean;
  horasAntesRecordatorio: number;
  permitirCancelacion: boolean;
  horasMinimasCancelacion: number;
  politicaNoShow: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export class ConfiguracionReservasService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  /**
   * Verifica que el restaurante tenga plan PREMIUM
   */
  private async verificarPlanPremium(restauranteId: string): Promise<void> {
    const suscripcionesService = new SuscripcionesService();
    const suscripcion = await suscripcionesService.obtenerPorRestauranteId(restauranteId);

    if (!suscripcion) {
      this.handleError(
        'La configuración de reservas solo está disponible para usuarios con plan PREMIUM. Por favor, actualiza tu plan para acceder a esta funcionalidad.',
        null,
        403
      );
    }

    if (suscripcion.tipoPlan !== 'premium' || suscripcion.estado !== 'active') {
      this.handleError(
        'La configuración de reservas solo está disponible para usuarios con plan PREMIUM activo. Por favor, actualiza tu plan para acceder a esta funcionalidad.',
        null,
        403
      );
    }
  }

  /**
   * Valida formato de hora (HH:mm)
   */
  private validarHora(hora: string | undefined): string | null {
    if (!hora) return null;
    
    const horaRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(hora)) {
      this.handleError(`Formato de hora inválido: ${hora}. Debe ser HH:mm (ej: 09:00, 14:30)`, null, 400);
    }
    
    return hora;
  }

  /**
   * Mapea un resultado de BD a la interfaz ConfiguracionReservas
   */
  private mapToConfiguracion(row: any): ConfiguracionReservas {
    // Convertir TIME a string HH:mm
    const formatTime = (time: any): string | null => {
      if (!time) return null;
      if (typeof time === 'string') {
        // Si ya es string, verificar formato
        if (time.includes(':')) {
          return time.substring(0, 5); // Tomar solo HH:mm
        }
        return time;
      }
      // Si es objeto Date o similar, convertir
      return null;
    };

    return {
      id: row.id,
      restauranteId: row.restaurante_id,
      reservasHabilitadas: row.reservas_habilitadas === 1 || row.reservas_habilitadas === true,
      horaAperturaLunes: formatTime(row.hora_apertura_lunes),
      horaCierreLunes: formatTime(row.hora_cierre_lunes),
      horaAperturaMartes: formatTime(row.hora_apertura_martes),
      horaCierreMartes: formatTime(row.hora_cierre_martes),
      horaAperturaMiercoles: formatTime(row.hora_apertura_miercoles),
      horaCierreMiercoles: formatTime(row.hora_cierre_miercoles),
      horaAperturaJueves: formatTime(row.hora_apertura_jueves),
      horaCierreJueves: formatTime(row.hora_cierre_jueves),
      horaAperturaViernes: formatTime(row.hora_apertura_viernes),
      horaCierreViernes: formatTime(row.hora_cierre_viernes),
      horaAperturaSabado: formatTime(row.hora_apertura_sabado),
      horaCierreSabado: formatTime(row.hora_cierre_sabado),
      horaAperturaDomingo: formatTime(row.hora_apertura_domingo),
      horaCierreDomingo: formatTime(row.hora_cierre_domingo),
      anticipacionMinimaHoras: row.anticipacion_minima_horas || 2,
      anticipacionMaximaDias: row.anticipacion_maxima_dias || 30,
      duracionReservaMinutos: row.duracion_reserva_minutos || 120,
      intervaloReservasMinutos: row.intervalo_reservas_minutos || 15,
      capacidadMaximaPersonas: row.capacidad_maxima_personas || 20,
      capacidadMinimaPersonas: row.capacidad_minima_personas || 1,
      confirmacionAutomatica: row.confirmacion_automatica === 1 || row.confirmacion_automatica === true,
      requiereConfirmacionCliente: row.requiere_confirmacion_cliente === 1 || row.requiere_confirmacion_cliente === true,
      notificarReservaNueva: row.notificar_reserva_nueva === 1 || row.notificar_reserva_nueva === true,
      notificarCancelacion: row.notificar_cancelacion === 1 || row.notificar_cancelacion === true,
      notificarRecordatorio: row.notificar_recordatorio === 1 || row.notificar_recordatorio === true,
      horasAntesRecordatorio: row.horas_antes_recordatorio || 24,
      permitirCancelacion: row.permitir_cancelacion === 1 || row.permitir_cancelacion === true,
      horasMinimasCancelacion: row.horas_minimas_cancelacion || 2,
      politicaNoShow: row.politica_no_show,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
    };
  }

  /**
   * Obtiene la configuración de reservas de un restaurante
   */
  async obtenerPorRestauranteId(restauranteId: string): Promise<ConfiguracionReservas | null> {
    this.logOperation(`obtener configuración de reservas por restaurante: ${restauranteId}`);

    const resultado = await AppDataSource.query(
      `SELECT * FROM configuracion_reservas WHERE restaurante_id = @0`,
      [restauranteId]
    );

    if (!resultado || resultado.length === 0) {
      return null;
    }

    return this.mapToConfiguracion(resultado[0]);
  }

  /**
   * Crea o actualiza la configuración de reservas
   * Si ya existe, la actualiza; si no, la crea
   */
  async crearOActualizar(
    restauranteId: string,
    crearConfiguracionDto: CrearConfiguracionReservasDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<ConfiguracionReservas> {
    this.logOperation('crear o actualizar configuración de reservas', { restauranteId, data: crearConfiguracionDto, usuarioId });

    // Verificar plan PREMIUM
    await this.verificarPlanPremium(restauranteId);

    // Verificar que el restaurante existe
    const restaurante = await AppDataSource.query(
      `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL`,
      [restauranteId]
    );

    if (!restaurante || restaurante.length === 0) {
      this.handleError('Restaurante no encontrado', null, 404);
    }

    // Verificar si ya existe configuración
    const configuracionExistente = await this.obtenerPorRestauranteId(restauranteId);

    if (configuracionExistente) {
      // Actualizar configuración existente
      return await this.actualizar(
        restauranteId,
        crearConfiguracionDto as any,
        usuarioId,
        requestInfo
      );
    }

    // Crear nueva configuración
    const fechaCreacion = getMonteriaLocalDate();

    // Validar y formatear horarios
    const validarYFormatearHora = (hora: string | undefined): string | null => {
      if (!hora) return null;
      return this.validarHora(hora);
    };

    const resultado = await AppDataSource.query(`
      INSERT INTO configuracion_reservas (
        restaurante_id, reservas_habilitadas,
        hora_apertura_lunes, hora_cierre_lunes,
        hora_apertura_martes, hora_cierre_martes,
        hora_apertura_miercoles, hora_cierre_miercoles,
        hora_apertura_jueves, hora_cierre_jueves,
        hora_apertura_viernes, hora_cierre_viernes,
        hora_apertura_sabado, hora_cierre_sabado,
        hora_apertura_domingo, hora_cierre_domingo,
        anticipacion_minima_horas, anticipacion_maxima_dias,
        duracion_reserva_minutos, intervalo_reservas_minutos,
        capacidad_maxima_personas, capacidad_minima_personas,
        confirmacion_automatica, requiere_confirmacion_cliente,
        notificar_reserva_nueva, notificar_cancelacion, notificar_recordatorio,
        horas_antes_recordatorio, permitir_cancelacion, horas_minimas_cancelacion,
        politica_no_show, fecha_creacion, fecha_actualizacion
      )
      OUTPUT INSERTED.*
      VALUES (
        @0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, @12, @13, @14, @15,
        @16, @17, @18, @19, @20, @21, @22, @23, @24, @25, @26, @27, @28, @29, @30, @31
      )
    `, [
      restauranteId,
      crearConfiguracionDto.reservasHabilitadas !== undefined ? (crearConfiguracionDto.reservasHabilitadas ? 1 : 0) : 1,
      validarYFormatearHora(crearConfiguracionDto.horaAperturaLunes),
      validarYFormatearHora(crearConfiguracionDto.horaCierreLunes),
      validarYFormatearHora(crearConfiguracionDto.horaAperturaMartes),
      validarYFormatearHora(crearConfiguracionDto.horaCierreMartes),
      validarYFormatearHora(crearConfiguracionDto.horaAperturaMiercoles),
      validarYFormatearHora(crearConfiguracionDto.horaCierreMiercoles),
      validarYFormatearHora(crearConfiguracionDto.horaAperturaJueves),
      validarYFormatearHora(crearConfiguracionDto.horaCierreJueves),
      validarYFormatearHora(crearConfiguracionDto.horaAperturaViernes),
      validarYFormatearHora(crearConfiguracionDto.horaCierreViernes),
      validarYFormatearHora(crearConfiguracionDto.horaAperturaSabado),
      validarYFormatearHora(crearConfiguracionDto.horaCierreSabado),
      validarYFormatearHora(crearConfiguracionDto.horaAperturaDomingo),
      validarYFormatearHora(crearConfiguracionDto.horaCierreDomingo),
      crearConfiguracionDto.anticipacionMinimaHoras || 2,
      crearConfiguracionDto.anticipacionMaximaDias || 30,
      crearConfiguracionDto.duracionReservaMinutos || 120,
      crearConfiguracionDto.intervaloReservasMinutos || 15,
      crearConfiguracionDto.capacidadMaximaPersonas || 20,
      crearConfiguracionDto.capacidadMinimaPersonas || 1,
      crearConfiguracionDto.confirmacionAutomatica !== undefined ? (crearConfiguracionDto.confirmacionAutomatica ? 1 : 0) : 0,
      crearConfiguracionDto.requiereConfirmacionCliente !== undefined ? (crearConfiguracionDto.requiereConfirmacionCliente ? 1 : 0) : 1,
      crearConfiguracionDto.notificarReservaNueva !== undefined ? (crearConfiguracionDto.notificarReservaNueva ? 1 : 0) : 1,
      crearConfiguracionDto.notificarCancelacion !== undefined ? (crearConfiguracionDto.notificarCancelacion ? 1 : 0) : 1,
      crearConfiguracionDto.notificarRecordatorio !== undefined ? (crearConfiguracionDto.notificarRecordatorio ? 1 : 0) : 1,
      crearConfiguracionDto.horasAntesRecordatorio || 24,
      crearConfiguracionDto.permitirCancelacion !== undefined ? (crearConfiguracionDto.permitirCancelacion ? 1 : 0) : 1,
      crearConfiguracionDto.horasMinimasCancelacion || 2,
      crearConfiguracionDto.politicaNoShow || null,
      fechaCreacion,
      fechaCreacion,
    ]);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al crear la configuración de reservas', null, 500);
    }

    const configuracion = this.mapToConfiguracion(resultado[0]);
    this.logSuccess('crear configuración de reservas', configuracion);

    return configuracion;
  }

  /**
   * Actualiza la configuración de reservas
   */
  async actualizar(
    restauranteId: string,
    actualizarConfiguracionDto: ActualizarConfiguracionReservasDto,
    usuarioId?: string,
    requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }
  ): Promise<ConfiguracionReservas> {
    this.logOperation('actualizar configuración de reservas', { restauranteId, data: actualizarConfiguracionDto, usuarioId });

    // Verificar plan PREMIUM
    await this.verificarPlanPremium(restauranteId);

    // Verificar que la configuración existe
    const configuracionExistente = await this.obtenerPorRestauranteId(restauranteId);
    if (!configuracionExistente) {
      this.handleError('Configuración de reservas no encontrada', null, 404);
    }

    // Construir campos a actualizar
    const campos: string[] = [];
    const valores: any[] = [];
    let indice = 0;

    const validarYFormatearHora = (hora: string | undefined): string | null => {
      if (hora === undefined) return undefined as any;
      if (!hora) return null;
      return this.validarHora(hora);
    };

    if (actualizarConfiguracionDto.reservasHabilitadas !== undefined) {
      campos.push(`reservas_habilitadas = @${indice}`);
      valores.push(actualizarConfiguracionDto.reservasHabilitadas ? 1 : 0);
      indice++;
    }

    // Horarios
    if (actualizarConfiguracionDto.horaAperturaLunes !== undefined) {
      campos.push(`hora_apertura_lunes = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaLunes));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreLunes !== undefined) {
      campos.push(`hora_cierre_lunes = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreLunes));
      indice++;
    }

    if (actualizarConfiguracionDto.horaAperturaMartes !== undefined) {
      campos.push(`hora_apertura_martes = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaMartes));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreMartes !== undefined) {
      campos.push(`hora_cierre_martes = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreMartes));
      indice++;
    }

    if (actualizarConfiguracionDto.horaAperturaMiercoles !== undefined) {
      campos.push(`hora_apertura_miercoles = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaMiercoles));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreMiercoles !== undefined) {
      campos.push(`hora_cierre_miercoles = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreMiercoles));
      indice++;
    }

    if (actualizarConfiguracionDto.horaAperturaJueves !== undefined) {
      campos.push(`hora_apertura_jueves = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaJueves));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreJueves !== undefined) {
      campos.push(`hora_cierre_jueves = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreJueves));
      indice++;
    }

    if (actualizarConfiguracionDto.horaAperturaViernes !== undefined) {
      campos.push(`hora_apertura_viernes = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaViernes));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreViernes !== undefined) {
      campos.push(`hora_cierre_viernes = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreViernes));
      indice++;
    }

    if (actualizarConfiguracionDto.horaAperturaSabado !== undefined) {
      campos.push(`hora_apertura_sabado = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaSabado));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreSabado !== undefined) {
      campos.push(`hora_cierre_sabado = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreSabado));
      indice++;
    }

    if (actualizarConfiguracionDto.horaAperturaDomingo !== undefined) {
      campos.push(`hora_apertura_domingo = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaAperturaDomingo));
      indice++;
    }

    if (actualizarConfiguracionDto.horaCierreDomingo !== undefined) {
      campos.push(`hora_cierre_domingo = @${indice}`);
      valores.push(validarYFormatearHora(actualizarConfiguracionDto.horaCierreDomingo));
      indice++;
    }

    // Configuración de reservas
    if (actualizarConfiguracionDto.anticipacionMinimaHoras !== undefined) {
      campos.push(`anticipacion_minima_horas = @${indice}`);
      valores.push(actualizarConfiguracionDto.anticipacionMinimaHoras);
      indice++;
    }

    if (actualizarConfiguracionDto.anticipacionMaximaDias !== undefined) {
      campos.push(`anticipacion_maxima_dias = @${indice}`);
      valores.push(actualizarConfiguracionDto.anticipacionMaximaDias);
      indice++;
    }

    if (actualizarConfiguracionDto.duracionReservaMinutos !== undefined) {
      campos.push(`duracion_reserva_minutos = @${indice}`);
      valores.push(actualizarConfiguracionDto.duracionReservaMinutos);
      indice++;
    }

    if (actualizarConfiguracionDto.intervaloReservasMinutos !== undefined) {
      campos.push(`intervalo_reservas_minutos = @${indice}`);
      valores.push(actualizarConfiguracionDto.intervaloReservasMinutos);
      indice++;
    }

    // Límites
    if (actualizarConfiguracionDto.capacidadMaximaPersonas !== undefined) {
      campos.push(`capacidad_maxima_personas = @${indice}`);
      valores.push(actualizarConfiguracionDto.capacidadMaximaPersonas);
      indice++;
    }

    if (actualizarConfiguracionDto.capacidadMinimaPersonas !== undefined) {
      campos.push(`capacidad_minima_personas = @${indice}`);
      valores.push(actualizarConfiguracionDto.capacidadMinimaPersonas);
      indice++;
    }

    // Confirmación
    if (actualizarConfiguracionDto.confirmacionAutomatica !== undefined) {
      campos.push(`confirmacion_automatica = @${indice}`);
      valores.push(actualizarConfiguracionDto.confirmacionAutomatica ? 1 : 0);
      indice++;
    }

    if (actualizarConfiguracionDto.requiereConfirmacionCliente !== undefined) {
      campos.push(`requiere_confirmacion_cliente = @${indice}`);
      valores.push(actualizarConfiguracionDto.requiereConfirmacionCliente ? 1 : 0);
      indice++;
    }

    // Notificaciones
    if (actualizarConfiguracionDto.notificarReservaNueva !== undefined) {
      campos.push(`notificar_reserva_nueva = @${indice}`);
      valores.push(actualizarConfiguracionDto.notificarReservaNueva ? 1 : 0);
      indice++;
    }

    if (actualizarConfiguracionDto.notificarCancelacion !== undefined) {
      campos.push(`notificar_cancelacion = @${indice}`);
      valores.push(actualizarConfiguracionDto.notificarCancelacion ? 1 : 0);
      indice++;
    }

    if (actualizarConfiguracionDto.notificarRecordatorio !== undefined) {
      campos.push(`notificar_recordatorio = @${indice}`);
      valores.push(actualizarConfiguracionDto.notificarRecordatorio ? 1 : 0);
      indice++;
    }

    if (actualizarConfiguracionDto.horasAntesRecordatorio !== undefined) {
      campos.push(`horas_antes_recordatorio = @${indice}`);
      valores.push(actualizarConfiguracionDto.horasAntesRecordatorio);
      indice++;
    }

    // Políticas
    if (actualizarConfiguracionDto.permitirCancelacion !== undefined) {
      campos.push(`permitir_cancelacion = @${indice}`);
      valores.push(actualizarConfiguracionDto.permitirCancelacion ? 1 : 0);
      indice++;
    }

    if (actualizarConfiguracionDto.horasMinimasCancelacion !== undefined) {
      campos.push(`horas_minimas_cancelacion = @${indice}`);
      valores.push(actualizarConfiguracionDto.horasMinimasCancelacion);
      indice++;
    }

    if (actualizarConfiguracionDto.politicaNoShow !== undefined) {
      campos.push(`politica_no_show = @${indice}`);
      valores.push(actualizarConfiguracionDto.politicaNoShow || null);
      indice++;
    }

    if (campos.length === 0) {
      return configuracionExistente!;
    }

    // Actualizar fecha_actualizacion
    campos.push(`fecha_actualizacion = @${indice}`);
    valores.push(getMonteriaLocalDate());
    indice++;

    valores.push(restauranteId);

    const query = `
      UPDATE configuracion_reservas
      SET ${campos.join(', ')}
      OUTPUT INSERTED.*
      WHERE restaurante_id = @${indice}
    `;

    const resultado = await AppDataSource.query(query, valores);

    if (!resultado || resultado.length === 0) {
      this.handleError('Error al actualizar la configuración de reservas', null, 500);
    }

    const configuracion = this.mapToConfiguracion(resultado[0]);
    this.logSuccess('actualizar configuración de reservas', configuracion);

    return configuracion;
  }
}

