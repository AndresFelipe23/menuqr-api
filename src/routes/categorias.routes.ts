import { Router } from 'express';
import { CategoriasController } from '../controllers/categorias.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearCategoriaDto, ActualizarCategoriaDto } from '../dto';

const router = Router();
const categoriasController = new CategoriasController();

/**
 * @route GET /api/categorias/public/restaurante/:restauranteId
 * @description Obtiene todas las categorías activas de un restaurante específico (público, no requiere autenticación)
 * @access Público
 */
router.get('/public/restaurante/:restauranteId', categoriasController.obtenerPorRestauranteIdPublico);

// Todas las rutas siguientes requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/categorias
 * @description Obtiene todas las categorías con paginación y filtros
 * @access Protegido (requiere autenticación)
 */
router.get('/', categoriasController.obtenerTodos);

/**
 * @route GET /api/categorias/restaurante/:restauranteId
 * @description Obtiene todas las categorías de un restaurante específico
 * @access Protegido (requiere autenticación)
 */
router.get('/restaurante/:restauranteId', categoriasController.obtenerPorRestauranteId);

/**
 * @route GET /api/categorias/:id
 * @description Obtiene una categoría por ID
 * @access Protegido (requiere autenticación)
 */
router.get('/:id', categoriasController.obtenerPorId);

/**
 * @route POST /api/categorias
 * @description Crea una nueva categoría
 * @access Protegido (requiere autenticación)
 * @body { restauranteId: string, nombre: string, descripcion?: string, imagenUrl?: string, ordenVisualizacion?: number, activa?: boolean }
 */
router.post('/', validateDto(CrearCategoriaDto), categoriasController.crear);

/**
 * @route PUT /api/categorias/:id
 * @description Actualiza una categoría
 * @access Protegido (requiere autenticación)
 * @body { nombre?: string, descripcion?: string, imagenUrl?: string, ordenVisualizacion?: number, activa?: boolean }
 */
router.put('/:id', validateDto(ActualizarCategoriaDto), categoriasController.actualizar);

/**
 * @route DELETE /api/categorias/:id
 * @description Elimina una categoría (solo si no tiene items del menú asignados)
 * @access Protegido (requiere autenticación)
 */
router.delete('/:id', categoriasController.eliminar);

export default router;

