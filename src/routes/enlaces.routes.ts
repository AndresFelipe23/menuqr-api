import { Router } from 'express';
import { EnlacesController } from '../controllers/enlaces.controller';
import { validateDto, validateQuery } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearEnlaceDto, ActualizarEnlaceDto, QueryEnlaceDto } from '../dto';

const router = Router();
const enlacesController = new EnlacesController();

/**
 * @route GET /api/enlaces/public/restaurante/:restauranteId
 * @description Obtiene todos los enlaces activos de un restaurante específico (público, no requiere autenticación)
 * @access Público
 * @param restauranteId - ID del restaurante (UUID)
 */
router.get('/public/restaurante/:restauranteId', enlacesController.obtenerPorRestauranteIdPublico);

// Todas las rutas siguientes requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/enlaces
 * @description Lista todos los enlaces con paginación y filtros opcionales
 * @access Protegido (requiere autenticación)
 * @query page - Número de página (default: 1)
 * @query limit - Resultados por página (default: 10)
 * @query restauranteId - Filtrar por restauranteId (UUID)
 * @query titulo - Filtrar por título (búsqueda parcial)
 * @query tipoIcono - Filtrar por tipo de icono
 * @query activo - Filtrar por estado activo (true/false)
 * @query orden - Orden de visualización (asc/desc, default: asc)
 */
router.get('/', validateQuery(QueryEnlaceDto), enlacesController.obtenerTodos);

/**
 * @route GET /api/enlaces/restaurante/:restauranteId
 * @description Obtiene todos los enlaces de un restaurante específico
 * @access Protegido (requiere autenticación)
 * @param restauranteId - ID del restaurante (UUID)
 */
router.get('/restaurante/:restauranteId', enlacesController.obtenerPorRestauranteId);

/**
 * @route GET /api/enlaces/:id
 * @description Obtiene un enlace por ID
 * @access Protegido (requiere autenticación)
 * @param id - ID del enlace (UUID)
 */
router.get('/:id', enlacesController.obtenerPorId);

/**
 * @route POST /api/enlaces
 * @description Crea un nuevo enlace
 * @access Protegido (requiere autenticación)
 * @body { restauranteId: string, titulo: string, url: string, ... }
 */
router.post('/', validateDto(CrearEnlaceDto), enlacesController.crear);

/**
 * @route PUT /api/enlaces/:id
 * @description Actualiza un enlace existente
 * @access Protegido (requiere autenticación)
 * @body { titulo?: string, url?: string, ... }
 */
router.put('/:id', validateDto(ActualizarEnlaceDto), enlacesController.actualizar);

/**
 * @route POST /api/enlaces/:id/clic
 * @description Incrementa el contador de clics de un enlace
 * @access Protegido (requiere autenticación)
 * @param id - ID del enlace (UUID)
 */
router.post('/:id/clic', enlacesController.incrementarClics);

/**
 * @route DELETE /api/enlaces/:id
 * @description Elimina un enlace
 * @access Protegido (requiere autenticación)
 * @param id - ID del enlace (UUID)
 */
router.delete('/:id', enlacesController.eliminar);

export default router;

