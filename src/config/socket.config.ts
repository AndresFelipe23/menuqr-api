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
          error: error.message,
        });
        return next(new Error('Token inválido'));
      }

      if (error instanceof jwt.TokenExpiredError) {
        Logger.warn('Token JWT expirado en WebSocket', {
          categoria: LogCategory.AUTHENTICACION,
        });
        return next(new Error('Token expirado'));
      }

      Logger.error('Error en autenticación WebSocket', {
        categoria: LogCategory.AUTHENTICACION,
        error: error instanceof Error ? error.message : String(error),
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
      socketId: socket.id,
    });

    // Unirse a la sala del restaurante
    if (user.restauranteId) {
      const restauranteRoom = `restaurante:${user.restauranteId}`;
      socket.join(restauranteRoom);
      Logger.info(`Usuario unido a sala: ${restauranteRoom}`, {
        categoria: LogCategory.SISTEMA,
        usuarioId: user.id,
        restauranteId: user.restauranteId,
        socketId: socket.id,
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
        socketId: socket.id,
        razon: reason,
      });
    });

    // Manejar errores
    socket.on('error', (error) => {
      Logger.error('Error en WebSocket', {
        categoria: LogCategory.SISTEMA,
        usuarioId: user.id,
        restauranteId: user.restauranteId,
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error),
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

