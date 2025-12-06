/**
 * Middleware para validación de datos usando class-validator
 */
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ResponseUtil } from '../utils/response.util';
import { Logger, LogCategory } from '../utils/logger';

/**
 * Valida un DTO usando class-validator
 */
export function validateDto(dtoClass: any, skipMissingProperties: boolean = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convertir el body plano a una instancia del DTO
      const dto = plainToInstance(dtoClass, req.body);

      // Validar el DTO
      const errors: ValidationError[] = await validate(dto as object, {
        skipMissingProperties,
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => {
          const messages = Object.values(error.constraints || {});
          return {
            field: error.property,
            message: messages.join(', '),
            value: error.value,
          };
        });

        Logger.warn('Error de validación de DTO', {
          categoria: LogCategory.API,
          metodoHttp: req.method,
          ruta: req.path,
          detalle: formattedErrors,
        });

        return ResponseUtil.validationError(res, formattedErrors, 'Error de validación');
      }

      // Reemplazar el body con el DTO validado y transformado
      req.body = dto;
      next();
    } catch (error) {
      Logger.error('Error en validación de DTO', error instanceof Error ? error : new Error(String(error)), {
        categoria: LogCategory.API,
        metodoHttp: req.method,
        ruta: req.path,
      });
      next(error);
    }
  };
}

/**
 * Valida parámetros de query
 */
export function validateQuery(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToInstance(dtoClass, req.query);
      const errors: ValidationError[] = await validate(dto as object, {
        skipMissingProperties: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          value: error.value,
        }));

        return ResponseUtil.validationError(res, formattedErrors, 'Error de validación en query params');
      }

      req.query = dto as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Valida parámetros de ruta
 */
export function validateParams(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToInstance(dtoClass, req.params);
      const errors: ValidationError[] = await validate(dto as object, {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          value: error.value,
        }));

        return ResponseUtil.validationError(res, formattedErrors, 'Error de validación en parámetros de ruta');
      }

      req.params = dto as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

