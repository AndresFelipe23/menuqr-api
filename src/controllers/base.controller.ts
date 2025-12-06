/**
 * Clase base para todos los controladores
 * Proporciona métodos comunes para manejo de respuestas y errores
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { ResponseUtil } from '../utils/response.util';
import { AppError } from '../middlewares/errorHandler';
import { Logger, LogCategory } from '../utils/logger';

export abstract class BaseController {
  protected responseUtil = ResponseUtil;

  /**
   * Wrapper para manejar errores en controladores async
   */
  protected asyncHandler(
    fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        Logger.error('Error en controlador', error instanceof Error ? error : new Error(String(error)), {
          categoria: LogCategory.API,
          metodoHttp: req.method,
          ruta: req.path,
          direccionIp: req.ip,
        });
        next(error);
      });
    };
  }

  /**
   * Obtiene el usuario autenticado de la request
   */
  protected getAuthenticatedUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }
    return req.user;
  }

  /**
   * Obtiene el ID del restaurante de la request
   */
  protected getRestaurantId(req: AuthenticatedRequest): string {
    const user = this.getAuthenticatedUser(req);
    if (!user.restauranteId) {
      throw new AppError('Restaurante no asociado al usuario', 400);
    }
    return user.restauranteId;
  }

  /**
   * Obtiene parámetros de paginación de la query
   */
  protected getPaginationParams(req: AuthenticatedRequest) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const sortBy = (req.query.sortBy as string) || 'fecha_creacion';
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';

    return { page, limit, sortBy, sortOrder, offset: (page - 1) * limit };
  }

  /**
   * Valida que el parámetro ID exista
   */
  protected requireId(req: AuthenticatedRequest, paramName: string = 'id'): string {
    const id = req.params[paramName];
    if (!id) {
      throw new AppError(`Parámetro ${paramName} requerido`, 400);
    }
    return id;
  }

  /**
   * Obtiene el body de la request tipado
   */
  protected getBody<T>(req: AuthenticatedRequest): T {
    return req.body as T;
  }

  /**
   * Extrae información del request para logging
   */
  protected getRequestInfo(req: AuthenticatedRequest): {
    metodoHttp?: string;
    ruta?: string;
    endpoint?: string;
    direccionIp?: string;
    agenteUsuario?: string;
  } {
    return {
      metodoHttp: req.method,
      ruta: req.path,
      endpoint: req.originalUrl || req.url,
      direccionIp: req.ip || (req as any).socket?.remoteAddress,
      agenteUsuario: req.get('user-agent') || undefined,
    };
  }
}

