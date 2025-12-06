/**
 * Utilidades para respuestas estandarizadas de la API
 */
import { Response } from 'express';
import { ApiResponse, ResponseMetadata, PaginatedResponse } from '../types/common.types';
import { Logger, LogCategory } from './logger';

export class ResponseUtil {
  /**
   * Respuesta exitosa con datos
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200,
    metadata?: ResponseMetadata
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };

    // No loguear respuestas exitosas automáticamente (solo errores)
    // El middleware requestLogger ya captura toda la información de requests
    // y los servicios loguean operaciones importantes con más contexto

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta exitosa sin datos (para operaciones como DELETE)
   */
  static successMessage(
    res: Response,
    message: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse = {
      success: true,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    // No loguear automáticamente (el requestLogger ya captura los requests)
    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de error
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    error?: string,
    errors?: Array<{ field: string; message: string; value?: any }>
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error,
      errors,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    Logger.error(message, undefined, {
      categoria: LogCategory.API,
      codigoEstadoHttp: statusCode,
      codigoError: error,
      detalle: errors,
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta paginada
   */
  static paginated<T>(
    res: Response,
    paginatedData: PaginatedResponse<T>,
    message?: string
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data: paginatedData.items,
      metadata: {
        timestamp: new Date().toISOString(),
        total: paginatedData.pagination.total,
        page: paginatedData.pagination.page,
        limit: paginatedData.pagination.limit,
        totalPages: paginatedData.pagination.totalPages,
        hasNext: paginatedData.pagination.hasNext,
        hasPrev: paginatedData.pagination.hasPrev,
      },
    };

    // No loguear automáticamente (el requestLogger ya captura los requests)
    return res.status(200).json(response);
  }

  /**
   * Respuesta de recurso no encontrado
   */
  static notFound(res: Response, resource: string = 'Recurso'): Response {
    return this.error(res, `${resource} no encontrado`, 404, 'NOT_FOUND');
  }

  /**
   * Respuesta de no autorizado
   */
  static unauthorized(res: Response, message: string = 'No autorizado'): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Respuesta de prohibido
   */
  static forbidden(res: Response, message: string = 'Acceso prohibido'): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Respuesta de validación fallida
   */
  static validationError(
    res: Response,
    errors: Array<{ field: string; message: string; value?: any }>,
    message: string = 'Error de validación'
  ): Response {
    return this.error(res, message, 400, 'VALIDATION_ERROR', errors);
  }

  /**
   * Respuesta de error interno del servidor
   */
  static internalError(
    res: Response,
    message: string = 'Error interno del servidor',
    error?: string
  ): Response {
    return this.error(res, message, 500, error || 'INTERNAL_SERVER_ERROR');
  }
}

