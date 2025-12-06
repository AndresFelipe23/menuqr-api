import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { ValidationError as ClassValidatorError } from 'class-validator';
import { Logger, LogCategory } from '../utils/logger';
import { ResponseUtil } from '../utils/response.util';

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Convertir a AppError si no lo es
  let appError: AppError;
  
  if (err instanceof AppError) {
    appError = err;
  } else {
    appError = new AppError(err.message || 'Error interno del servidor', 500);
  }

  // Default error
  appError.statusCode = appError.statusCode || 500;
  appError.status = appError.status || 'error';

  // TypeORM Query Error
  if (err instanceof QueryFailedError) {
    Logger.error('Error en consulta a base de datos', err, {
      categoria: LogCategory.BASE_DATOS,
      metodoHttp: req.method,
      ruta: req.path,
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
    return ResponseUtil.error(
      res,
      'Error en la consulta a la base de datos',
      400,
      'DATABASE_ERROR',
      undefined
    );
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    Logger.warn('Token JWT inválido', {
      categoria: LogCategory.AUTHENTICACION,
      metodoHttp: req.method,
      ruta: req.path,
      direccionIp: req.ip,
    });
    return ResponseUtil.error(res, 'Token inválido', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    Logger.warn('Token JWT expirado', {
      categoria: LogCategory.AUTHENTICACION,
      metodoHttp: req.method,
      ruta: req.path,
      direccionIp: req.ip,
    });
    return ResponseUtil.error(res, 'Token expirado', 401, 'TOKEN_EXPIRED');
  }

  // Validation Errors (class-validator)
  if (Array.isArray((err as any).errors)) {
    const validationErrors = (err as any).errors.map((error: ClassValidatorError) => ({
      field: error.property,
      message: Object.values(error.constraints || {}).join(', '),
      value: error.value,
    }));

    Logger.warn('Error de validación', {
      categoria: LogCategory.API,
      metodoHttp: req.method,
      ruta: req.path,
      detalle: validationErrors,
    });

    return ResponseUtil.validationError(res, validationErrors, 'Error de validación');
  }

  // Duplicate Key Error (SQL Server)
  if (err.message?.includes('UNIQUE constraint') || err.message?.includes('duplicate key')) {
    Logger.warn('Intento de duplicar registro', {
      categoria: LogCategory.BASE_DATOS,
      metodoHttp: req.method,
      ruta: req.path,
    });
    return ResponseUtil.error(res, 'El recurso ya existe', 409, 'DUPLICATE_ENTRY');
  }

  // Foreign Key Error
  if (err.message?.includes('FOREIGN KEY constraint') || err.message?.includes('foreign key')) {
    Logger.warn('Error de clave foránea', {
      categoria: LogCategory.BASE_DATOS,
      metodoHttp: req.method,
      ruta: req.path,
    });
    return ResponseUtil.error(res, 'Error de relación con otros recursos', 400, 'FOREIGN_KEY_ERROR');
  }

  // Log del error
  Logger.error('Error no manejado', appError, {
    categoria: LogCategory.SISTEMA,
    metodoHttp: req.method,
    ruta: req.path,
    codigoEstadoHttp: appError.statusCode,
    direccionIp: req.ip,
    agenteUsuario: req.get('user-agent'),
  });

  // Response
  if (appError.isOperational) {
    return ResponseUtil.error(
      res,
      appError.message,
      appError.statusCode,
      appError.status.toUpperCase()
    );
  }

  // Error no operacional (error del sistema)
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : appError.message;

  return ResponseUtil.internalError(res, message, appError.status.toUpperCase());
};

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

