/**
 * Utilidades para paginación
 */
import { PaginatedResponse, PaginationParams } from '../types/common.types';

export class PaginationUtil {
  /**
   * Calcula la información de paginación
   */
  static calculatePagination(
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<any>['pagination'] {
    const totalPages = Math.ceil(total / limit);

    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Crea una respuesta paginada
   */
  static createPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    return {
      items,
      pagination: this.calculatePagination(total, limit, page),
    };
  }

  /**
   * Normaliza los parámetros de paginación de la query
   */
  static normalizeParams(query: any): Required<PaginationParams> {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const sortBy = query.sortBy || 'fecha_creacion';
    const sortOrder = (query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    return {
      page,
      limit,
      sortBy,
      sortOrder,
    };
  }

  /**
   * Calcula el offset para queries SQL
   */
  static getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }
}

