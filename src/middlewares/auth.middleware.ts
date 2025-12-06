import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/express.types';
import { jwtConfig } from '../config/jwt.config';
import { JwtPayload, RequestUser } from '../types';
import { AppDataSource } from '../config/database';
import { AppError } from './errorHandler';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Middleware para autenticar usuarios mediante JWT
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación no proporcionado', 401);
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar y decodificar token
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

    // Buscar usuario en la base de datos
    const usuario = await AppDataSource.query(
      `SELECT 
        u.id, u.correo, u.nombre, u.activo, u.restaurante_id,
        ru.rol_id,
        r.nombre as rol_nombre,
        r.nombre as restaurante_nombre
      FROM usuarios u
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ru.rol_id
      LEFT JOIN restaurantes rest ON rest.id = u.restaurante_id
      WHERE u.id = @0 AND u.fecha_eliminacion IS NULL`,
      [decoded.userId]
    );

    if (!usuario || usuario.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const user = usuario[0];

    if (!user.activo) {
      throw new AppError('Usuario inactivo', 403);
    }

    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      email: user.correo,
      nombre: user.nombre,
      rolId: user.rol_id || '',
      rolNombre: user.rol_nombre || 'Sin rol',
      restauranteId: user.restaurante_id,
      restauranteNombre: user.restaurante_nombre,
    } as RequestUser;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      Logger.warn('Token JWT inválido', {
        categoria: LogCategory.AUTHENTICACION,
        metodoHttp: req.method,
        ruta: req.path,
        direccionIp: req.ip,
        error: error.message,
      });
      throw new AppError('Token inválido. Por favor, inicia sesión nuevamente.', 401);
    }

    if (error instanceof jwt.TokenExpiredError) {
      Logger.warn('Token JWT expirado', {
        categoria: LogCategory.AUTHENTICACION,
        metodoHttp: req.method,
        ruta: req.path,
        direccionIp: req.ip,
      });
      throw new AppError('Token expirado. Por favor, inicia sesión nuevamente.', 401);
    }

    // Si es un AppError, re-lanzarlo tal cual
    if (error instanceof AppError) {
      throw error;
    }

    // Para otros errores, lanzar un error genérico
    Logger.error('Error inesperado en autenticación', {
      categoria: LogCategory.AUTHENTICACION,
      metodoHttp: req.method,
      ruta: req.path,
      direccionIp: req.ip,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError('Error de autenticación', 401);
  }
}

/**
 * Middleware opcional: autentica si hay token, pero no falla si no hay
 */
export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authenticate(req, res, next);
  } catch (error) {
    // Si falla la autenticación, simplemente continuar sin usuario
    next();
  }
}

