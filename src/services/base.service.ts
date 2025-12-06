/**
 * Clase base para todos los servicios
 * Proporciona funcionalidades comunes como logging y manejo de errores
 */
import { Logger, LogCategory } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

export abstract class BaseService {
  protected logger = Logger;
  protected logCategory: LogCategory = LogCategory.NEGOCIO;

  /**
   * Maneja errores y los convierte a AppError
   */
  protected handleError(message: string, error: any, statusCode: number = 500): never {
    this.logger.error(message, error instanceof Error ? error : new Error(String(error)), {
      categoria: this.logCategory,
      codigoError: error?.code,
      detalle: error,
    });

    throw new AppError(message, statusCode);
  }

  /**
   * Log de operación exitosa (solo consola en desarrollo, no BD)
   * Para logs importantes con contexto completo, usar Logger.info directamente
   */
  protected logSuccess(operation: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] [${this.logCategory}] ${operation} completado exitosamente`, data || '');
    }
  }

  /**
   * Log de operación iniciada (solo consola en desarrollo, no BD)
   * Para logs importantes con contexto completo, usar Logger.info directamente
   */
  protected logOperation(operation: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] [${this.logCategory}] Iniciando ${operation}`, data || '');
    }
  }

  /**
   * Valida que un valor exista, lanza error si no
   */
  protected requireExists<T>(value: T | null | undefined, message: string): T {
    if (!value) {
      this.handleError(message, null, 404);
    }
    return value;
  }

  /**
   * Valida que una condición sea verdadera
   */
  protected require(condition: boolean, message: string, statusCode: number = 400): void {
    if (!condition) {
      this.handleError(message, null, statusCode);
    }
  }
}

