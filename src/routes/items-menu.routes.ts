import { Router } from 'express';
import { ItemsMenuController } from '../controllers/items-menu.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validation.middleware';
import { CrearItemMenuDto, ActualizarItemMenuDto, QueryItemMenuDto } from '../dto';

const router = Router();
const itemsMenuController = new ItemsMenuController();

/**
 * @route GET /api/items-menu/public/restaurante/:restauranteId
 * @desc Obtener todos los items disponibles del menú de un restaurante (público, no requiere autenticación)
 * @access Público
 */
router.get(
  '/public/restaurante/:restauranteId',
  itemsMenuController.obtenerPorRestauranteIdPublico.bind(itemsMenuController)
);

/**
 * @route GET /api/items-menu/public/:id
 * @desc Obtener un item del menú por ID (público, no requiere autenticación)
 * @access Público
 */
router.get(
  '/public/:id',
  itemsMenuController.obtenerPorIdPublico.bind(itemsMenuController)
);

/**
 * @route GET /items-menu
 * @desc Obtener todos los items del menú con paginación y filtros
 * @access Private
 */
router.get(
  '/',
  authenticate,
  validateDto(QueryItemMenuDto, 'query'),
  itemsMenuController.obtenerTodos.bind(itemsMenuController)
);

/**
 * @route GET /items-menu/:id
 * @desc Obtener un item del menú por ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  itemsMenuController.obtenerPorId.bind(itemsMenuController)
);

/**
 * @route GET /items-menu/restaurante/:restauranteId
 * @desc Obtener todos los items del menú de un restaurante
 * @access Private
 */
router.get(
  '/restaurante/:restauranteId',
  authenticate,
  itemsMenuController.obtenerPorRestauranteId.bind(itemsMenuController)
);

/**
 * @route GET /items-menu/categoria/:categoriaId
 * @desc Obtener todos los items del menú de una categoría
 * @access Private
 */
router.get(
  '/categoria/:categoriaId',
  authenticate,
  itemsMenuController.obtenerPorCategoriaId.bind(itemsMenuController)
);

/**
 * @route POST /items-menu
 * @desc Crear un nuevo item del menú
 * @access Private
 */
router.post(
  '/',
  authenticate,
  validateDto(CrearItemMenuDto, 'body'),
  itemsMenuController.crear.bind(itemsMenuController)
);

/**
 * @route PUT /items-menu/:id
 * @desc Actualizar un item del menú
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  validateDto(ActualizarItemMenuDto, 'body'),
  itemsMenuController.actualizar.bind(itemsMenuController)
);

/**
 * @route DELETE /items-menu/:id
 * @desc Eliminar un item del menú
 * @access Private
 */
router.delete(
  '/:id',
  authenticate,
  itemsMenuController.eliminar.bind(itemsMenuController)
);

export default router;

