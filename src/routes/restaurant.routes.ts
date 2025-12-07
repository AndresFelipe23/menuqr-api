import { Router } from 'express';
import { RestaurantsController } from '../controllers/restaurants.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearRestauranteDto, ActualizarRestauranteDto } from '../dto';

const router = Router();
const restaurantsController = new RestaurantsController();

/**
 * @route GET /api/restaurants/public
 * @description Lista todos los restaurantes activos (público, no requiere autenticación)
 * @access Público
 */
router.get('/public', restaurantsController.obtenerTodosPublicos);

/**
 * @route GET /api/restaurants/public/:slug
 * @description Obtiene un restaurante por slug (público, no requiere autenticación)
 * @access Público
 * @param slug - Slug del restaurante
 */
router.get('/public/:slug', restaurantsController.obtenerPorSlug);

/**
 * @route GET /api/restaurants
 * @description Lista todos los restaurantes con paginación y filtros opcionales
 * @access Protegido (requiere autenticación)
 * @query page - Número de página (default: 1)
 * @query limit - Resultados por página (default: 10)
 * @query nombre - Filtrar por nombre (búsqueda parcial)
 * @query slug - Filtrar por slug exacto
 * @query activo - Filtrar por estado activo (true/false)
 * @query estadoSuscripcion - Filtrar por estado de suscripción
 * @query ciudad - Filtrar por ciudad
 * @query pais - Filtrar por país
 */
router.get('/', authenticate, restaurantsController.obtenerTodos);

/**
 * @route GET /api/restaurants/:id
 * @description Obtiene los detalles de un restaurante específico por su ID
 * @access Protegido (requiere autenticación)
 * @param id - ID del restaurante (UUID)
 */
router.get('/:id', authenticate, restaurantsController.obtenerPorId);

/**
 * @route POST /api/restaurants
 * @description Crea un nuevo restaurante
 * @access Protegido (requiere autenticación)
 * @body CrearRestauranteDto
 */
router.post('/', authenticate, validateDto(CrearRestauranteDto), restaurantsController.crear);

/**
 * @route PUT /api/restaurants/:id
 * @description Actualiza un restaurante existente
 * @access Protegido (requiere autenticación)
 * @param id - ID del restaurante (UUID)
 * @body ActualizarRestauranteDto
 */
router.put('/:id', authenticate, validateDto(ActualizarRestauranteDto), restaurantsController.actualizar);

/**
 * @route DELETE /api/restaurants/:id
 * @description Elimina un restaurante (soft delete)
 * @access Protegido (requiere autenticación)
 * @param id - ID del restaurante (UUID)
 */
router.delete('/:id', authenticate, restaurantsController.eliminar);

export default router;

