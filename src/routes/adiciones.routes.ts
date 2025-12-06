import { Router } from 'express';
import { AdicionesController } from '../controllers/adiciones.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateDto, validateQuery } from '../middlewares/validation.middleware';
import { CrearAdicionDto, ActualizarAdicionDto, QueryAdicionDto } from '../dto';

const router = Router();
const adicionesController = new AdicionesController();

/**
 * @route GET /adiciones
 * @desc Obtener todas las adiciones con paginación y filtros
 * @access Private
 */
router.get(
  '/',
  authenticate,
  validateQuery(QueryAdicionDto),
  adicionesController.obtenerTodos.bind(adicionesController)
);

/**
 * @route GET /adiciones/:id
 * @desc Obtener una adición por ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  adicionesController.obtenerPorId.bind(adicionesController)
);

/**
 * @route GET /adiciones/restaurante/:restauranteId
 * @desc Obtener todas las adiciones de un restaurante
 * @access Private
 */
router.get(
  '/restaurante/:restauranteId',
  authenticate,
  adicionesController.obtenerPorRestauranteId.bind(adicionesController)
);

/**
 * @route POST /adiciones
 * @desc Crear una nueva adición
 * @access Private
 */
router.post(
  '/',
  authenticate,
  validateDto(CrearAdicionDto),
  adicionesController.crear.bind(adicionesController)
);

/**
 * @route PUT /adiciones/:id
 * @desc Actualizar una adición
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  validateDto(ActualizarAdicionDto),
  adicionesController.actualizar.bind(adicionesController)
);

/**
 * @route DELETE /adiciones/:id
 * @desc Eliminar una adición
 * @access Private
 */
router.delete(
  '/:id',
  authenticate,
  adicionesController.eliminar.bind(adicionesController)
);

export default router;

