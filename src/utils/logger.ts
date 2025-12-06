import { AppDataSource } from '../config/database';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export enum LogCategory {
  AUTHENTICACION = 'autenticacion',
  AUTORIZACION = 'autorizacion',
  API = 'api',
  BASE_DATOS = 'base_datos',
  NEGOCIO = 'negocio',
  SISTEMA = 'sistema',
  SEGURIDAD = 'seguridad'
}

interface LogData {
  nivel: LogLevel;
  categoria: LogCategory;
  mensaje: string;
  detalle?: any;
  stackTrace?: string;
  restauranteId?: string;
  usuarioId?: string;
  metodoHttp?: string;
  ruta?: string;
  endpoint?: string;
  direccionIp?: string;
  agenteUsuario?: string;
  idSesion?: string;
  entidadTipo?: string;
  entidadId?: string;
  tiempoEjecucionMs?: number;
  codigoEstadoHttp?: number;
  codigoError?: string;
  metadata?: any;
  skipDatabase?: boolean; // Si es true, no guarda en BD (solo consola)
}

export class Logger {
  static async log(data: LogData): Promise<void> {
    try {
      // Log a consola (desarrollo)
      if (process.env.NODE_ENV === 'development') {
        const logMessage = `[${data.nivel}] [${data.categoria}] ${data.mensaje}`;
        console.log(logMessage);
        if (data.detalle) {
          console.log('Detalle:', JSON.stringify(data.detalle, null, 2));
        }
        if (data.stackTrace) {
          console.error('Stack Trace:', data.stackTrace);
        }
      }

      // Log a base de datos (si está disponible y no está marcado para omitir)
      if (AppDataSource.isInitialized && !data.skipDatabase) {
        try {
          // Convertir fecha a hora local de Montería, Colombia (UTC-5)
          // Obtener la fecha/hora actual en UTC
          const ahora = new Date();
          // Restar 5 horas (Montería está en UTC-5, sin horario de verano)
          const offsetMonteriaMs = -5 * 60 * 60 * 1000; // -5 horas en milisegundos
          const fechaMonteria = new Date(ahora.getTime() + offsetMonteriaMs);
          
          // Formatear la fecha para SQL Server (YYYY-MM-DD HH:mm:ss.sss)
          // Obtener año, mes, día, hora, minuto, segundo, milisegundo
          const año = fechaMonteria.getUTCFullYear();
          const mes = String(fechaMonteria.getUTCMonth() + 1).padStart(2, '0');
          const dia = String(fechaMonteria.getUTCDate()).padStart(2, '0');
          const hora = String(fechaMonteria.getUTCHours()).padStart(2, '0');
          const minuto = String(fechaMonteria.getUTCMinutes()).padStart(2, '0');
          const segundo = String(fechaMonteria.getUTCSeconds()).padStart(2, '0');
          const milisegundo = String(fechaMonteria.getUTCMilliseconds()).padStart(3, '0');
          const fechaFormateada = `${año}-${mes}-${dia} ${hora}:${minuto}:${segundo}.${milisegundo}`;
          
          await AppDataSource.query(`
            INSERT INTO logs_sistema (
              nivel, categoria, mensaje, detalle, stack_trace,
              restaurante_id, usuario_id, metodo_http, ruta, endpoint,
              direccion_ip, agente_usuario, id_sesion,
              entidad_tipo, entidad_id, tiempo_ejecucion_ms,
              codigo_estado_http, codigo_error, metadata,
              fecha_creacion
            )
            VALUES (
              @0, @1, @2, @3, @4, @5, @6, @7, @8, @9,
              @10, @11, @12, @13, @14, @15, @16, @17, @18, @19
            )
          `, [
            data.nivel,
            data.categoria,
            data.mensaje,
            data.detalle ? JSON.stringify(data.detalle) : null,
            data.stackTrace || null,
            data.restauranteId || null,
            data.usuarioId || null,
            data.metodoHttp || null,
            data.ruta || null,
            data.endpoint || null,
            data.direccionIp || null,
            data.agenteUsuario || null,
            data.idSesion || null,
            data.entidadTipo || null,
            data.entidadId || null,
            data.tiempoEjecucionMs || null,
            data.codigoEstadoHttp || null,
            data.codigoError || null,
            data.metadata ? JSON.stringify(data.metadata) : null,
            fechaFormateada // Hora local de Montería
          ]);
        } catch (dbError) {
          // Si falla el log a BD, solo loguear a consola
          console.error('Error al guardar log en BD:', dbError);
        }
      }
    } catch (error) {
      console.error('Error en Logger:', error);
    }
  }

  static error(message: string, error?: Error, data?: Partial<LogData>): void {
    Logger.log({
      nivel: LogLevel.ERROR,
      categoria: data?.categoria || LogCategory.SISTEMA,
      mensaje: message,
      detalle: error ? { message: error.message, name: error.name } : data?.detalle,
      stackTrace: error?.stack,
      ...data
    });
  }

  static warn(message: string, data?: Partial<LogData>): void {
    Logger.log({
      nivel: LogLevel.WARN,
      categoria: data?.categoria || LogCategory.SISTEMA,
      mensaje: message,
      ...data
    });
  }

  static info(message: string, data?: Partial<LogData>): void {
    Logger.log({
      nivel: LogLevel.INFO,
      categoria: data?.categoria || LogCategory.SISTEMA,
      mensaje: message,
      ...data
    });
  }

  static debug(message: string, data?: Partial<LogData>): void {
    if (process.env.NODE_ENV === 'development') {
      Logger.log({
        nivel: LogLevel.DEBUG,
        categoria: data?.categoria || LogCategory.SISTEMA,
        mensaje: message,
        ...data
      });
    }
  }
}

