/**
 * Configuración de Socket.io
 */
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { jwtConfig } from './jwt.config';
import { AppDataSource } from './database';
import { Logger, LogCategory } from '../utils/logger';
import { JwtPayload } from '../types';
import { SUBSCRIPTION_PLANS } from './stripe.config';

export interface SocketUser {
  id: string;
  email: string;
  nombre: string;
  restauranteId?: string;
  rolId: string;
  rolNombre: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

let io: SocketIOServer | null = null;

/**
 * Inicializa Socket.io con el servidor HTTP
 */
export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  if (io) {
    return io;
  }

  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4321'];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins.length > 0 && corsOrigins[0] !== '*' ? corsOrigins : true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticación
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Token de autenticación no proporcionado'));
      }

      // Verificar token
      const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

      // Buscar usuario en la base de datos
      const usuario = await AppDataSource.query(
        `SELECT 
          u.id, u.correo, u.nombre, u.activo, u.restaurante_id,
          ru.rol_id,
          r.nombre as rol_nombre
        FROM usuarios u
        LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
        LEFT JOIN roles r ON r.id = ru.rol_id
        WHERE u.id = @0 AND u.fecha_eliminacion IS NULL`,
        [decoded.userId]
      );

      if (!usuario || usuario.length === 0) {
        return next(new Error('Usuario no encontrado'));
      }

      const user = usuario[0];

      if (!user.activo) {
        return next(new Error('Usuario inactivo'));
      }

      // Verificar si el restaurante tiene acceso a WebSockets (solo planes PRO y PREMIUM)
      if (user.restaurante_id) {
        try {
          // Consulta simplificada similar a suscripciones.service.ts
          const suscripcion = await AppDataSource.query(
            `SELECT tipo_plan, estado FROM suscripciones WHERE restaurante_id = @0`,
            [user.restaurante_id]
          );

          if (suscripcion && suscripcion.length > 0) {
            const suscripcionData = suscripcion[0];
            const tipoPlan = suscripcionData.tipo_plan;
            const estadoSuscripcion = suscripcionData.estado;

            // Solo verificar si la suscripción está activa
            if (estadoSuscripcion === 'active') {
              const plan = SUBSCRIPTION_PLANS[tipoPlan as keyof typeof SUBSCRIPTION_PLANS];
              
              // Verificar si el plan permite websockets
              if (!plan || !plan.limits.websockets) {
                Logger.warn('Intento de conexión WebSocket con plan sin acceso', {
                  categoria: LogCategory.AUTHENTICACION,
                  usuarioId: user.id,
                  restauranteId: user.restaurante_id,
                  detalle: { tipoPlan },
                });
                return next(new Error('WebSockets solo están disponibles para planes PRO y PREMIUM. Actualiza tu plan para acceder a esta funcionalidad.'));
              }
            } else {
              // Suscripción no activa, bloquear websockets
              Logger.warn('Intento de conexión WebSocket con suscripción inactiva', {
                categoria: LogCategory.AUTHENTICACION,
                usuarioId: user.id,
                restauranteId: user.restaurante_id,
                detalle: { estado: estadoSuscripcion },
              });
              return next(new Error('WebSockets solo están disponibles para planes PRO y PREMIUM activos. Actualiza tu plan para acceder a esta funcionalidad.'));
            }
          } else {
            // Si no hay suscripción, asumir plan FREE (no websockets)
            Logger.warn('Intento de conexión WebSocket sin suscripción', {
              categoria: LogCategory.AUTHENTICACION,
              usuarioId: user.id,
              restauranteId: user.restaurante_id,
            });
            return next(new Error('WebSockets solo están disponibles para planes PRO y PREMIUM. Actualiza tu plan para acceder a esta funcionalidad.'));
          }
        } catch (subscriptionError: any) {
          Logger.error('Error al verificar suscripción para WebSocket', subscriptionError instanceof Error ? subscriptionError : new Error(String(subscriptionError)), {
            categoria: LogCategory.AUTHENTICACION,
            usuarioId: user.id,
            restauranteId: user.restaurante_id,
            detalle: { 
              error: subscriptionError.message || String(subscriptionError),
              stack: subscriptionError.stack,
            },
          });
          // En caso de error en la consulta, permitir conexión (el frontend ya valida el plan)
          // Esto evita bloquear completamente si hay un error temporal en la BD
          Logger.warn('Permitiendo conexión WebSocket debido a error en verificación (fallback)', {
            categoria: LogCategory.AUTHENTICACION,
            usuarioId: user.id,
            restauranteId: user.restaurante_id,
          });
        }
      } else {
        // Si no tiene restaurante, no puede usar websockets
        return next(new Error('Usuario sin restaurante asociado'));
      }

      // Agregar información del usuario al socket
      socket.user = {
        id: user.id,
        email: user.correo,
        nombre: user.nombre,
        restauranteId: user.restaurante_id,
        rolId: user.rol_id || '',
        rolNombre: user.rol_nombre || 'Sin rol',
      };

      next();
    } catch (error: any) {
      if (error instanceof jwt.JsonWebTokenError) {
        Logger.warn('Token JWT inválido en WebSocket', {
          categoria: LogCategory.AUTHENTICACION,
          detalle: { error: error.message },
        });
        return next(new Error('Token inválido'));
      }

      if (error instanceof jwt.TokenExpiredError) {
        Logger.warn('Token JWT expirado en WebSocket', {
          categoria: LogCategory.AUTHENTICACION,
        });
        return next(new Error('Token expirado'));
      }

      Logger.error('Error en autenticación WebSocket', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.AUTHENTICACION,
      });
      next(new Error('Error de autenticación'));
    }
  });

  // Manejar conexiones
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    Logger.info('Cliente WebSocket conectado', {
      categoria: LogCategory.SISTEMA,
      usuarioId: user.id,
      restauranteId: user.restauranteId,
      detalle: { socketId: socket.id },
    });

    // Unirse a la sala del restaurante
    if (user.restauranteId) {
      const restauranteRoom = `restaurante:${user.restauranteId}`;
      socket.join(restauranteRoom);
      Logger.info(`Usuario unido a sala: ${restauranteRoom}`, {
        categoria: LogCategory.SISTEMA,
        usuarioId: user.id,
        restauranteId: user.restauranteId,
        detalle: { socketId: socket.id },
      });
    }

    // Unirse a sala por rol (para notificaciones específicas)
    if (user.rolId) {
      const rolRoom = `rol:${user.rolId}`;
      socket.join(rolRoom);
    }

    // Unirse a sala personal del usuario
    socket.join(`usuario:${user.id}`);

    // Manejar desconexión
    socket.on('disconnect', (reason) => {
      Logger.info('Cliente WebSocket desconectado', {
        categoria: LogCategory.SISTEMA,
        usuarioId: user.id,
        restauranteId: user.restauranteId,
        detalle: { socketId: socket.id, razon: reason },
      });
    });

    // Manejar errores
    socket.on('error', (error) => {
      Logger.error('Error en WebSocket', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.SISTEMA,
        usuarioId: user.id,
        restauranteId: user.restauranteId,
        detalle: { socketId: socket.id },
      });
    });
  });

  Logger.info('Socket.io inicializado correctamente', {
    categoria: LogCategory.SISTEMA,
  });

  return io;
}

/**
 * Obtiene la instancia de Socket.io
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado. Llama a initializeSocketIO primero.');
  }
  return io;
}

/**
 * Emite un evento a todos los clientes de un restaurante
 */
export function emitToRestaurante(restauranteId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`restaurante:${restauranteId}`).emit(event, data);
}

/**
 * Emite un evento a todos los clientes con un rol específico en un restaurante
 */
export function emitToRol(rolId: string, restauranteId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`rol:${rolId}`).to(`restaurante:${restauranteId}`).emit(event, data);
}

/**
 * Emite un evento a un usuario específico
 */
export function emitToUsuario(usuarioId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`usuario:${usuarioId}`).emit(event, data);
}

/**
 * Emite un evento a todos los clientes conectados
 */
export function emitToAll(event: string, data: any): void {
  if (!io) return;
  io.emit(event, data);
}

