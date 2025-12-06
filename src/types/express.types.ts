/**
 * Extensiones de tipos para Express Request y Response
 */
import { Request } from 'express';
import { RequestUser } from './common.types';

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

export interface RequestWithRestaurant extends AuthenticatedRequest {
  restauranteId?: string;
}

