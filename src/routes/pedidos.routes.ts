import { Router } from 'express';
import { PedidosController } from '../controllers/pedidos.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateDto, validateQuery } from '../middlewares/validation.middleware';
import { CrearPedidoDto, ActualizarPedidoDto, QueryPedidoDto } from '../dto';

const router = Router();
const pedidosController = new PedidosController();

/**
 * @route GET /pedidos
 * @desc Obtener todos los pedidos con paginación y filtros
 * @access Private
 */
router.get(
  '/',
  authenticate,
  validateQuery(QueryPedidoDto),
  pedidosController.obtenerTodos.bind(pedidosController)
);

/**
 * @route GET /pedidos/:id/historial
 * @desc Obtener el historial de cambios de estado de un pedido
 * @access Private
 */
router.get(
  '/:id/historial',
  authenticate,
  pedidosController.obtenerHistorial.bind(pedidosController)
);

/**
 * @route GET /pedidos/:id
 * @desc Obtener un pedido por ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  pedidosController.obtenerPorId.bind(pedidosController)
);

/**
 * @route GET /pedidos/restaurante/:restauranteId
 * @desc Obtener todos los pedidos de un restaurante
 * @access Private
 */
router.get(
  '/restaurante/:restauranteId',
  authenticate,
  pedidosController.obtenerPorRestauranteId.bind(pedidosController)
);

/**
 * @route GET /pedidos/mesa/:mesaId
 * @desc Obtener todos los pedidos de una mesa
 * @access Private
 */
router.get(
  '/mesa/:mesaId',
  authenticate,
  pedidosController.obtenerPorMesaId.bind(pedidosController)
);

/**
 * @route POST /api/pedidos/public
 * @desc Crear un nuevo pedido (público, no requiere autenticación)
 * @access Público
 */
router.post(
  '/public',
  validateDto(CrearPedidoDto),
  pedidosController.crearPublico.bind(pedidosController)
);

/**
 * @route POST /pedidos
 * @desc Crear un nuevo pedido
 * @access Private
 */
router.post(
  '/',
  authenticate,
  validateDto(CrearPedidoDto),
  pedidosController.crear.bind(pedidosController)
);

/**
 * @route PUT /pedidos/:id
 * @desc Actualizar un pedido
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  validateDto(ActualizarPedidoDto),
  pedidosController.actualizar.bind(pedidosController)
);

/**
 * @route PATCH /pedidos/:id/estado
 * @desc Cambiar el estado de un pedido
 * @access Private
 */
router.patch(
  '/:id/estado',
  authenticate,
  pedidosController.cambiarEstado.bind(pedidosController)
);

/**
 * @route POST /pedidos/:id/confirmar
 * @desc Confirmar un pedido pendiente de confirmación
 * @access Private
 */
router.post(
  '/:id/confirmar',
  authenticate,
  pedidosController.confirmarPedido.bind(pedidosController)
);

/**
 * @route PATCH /pedidos/items/:itemId/estado
 * @desc Actualizar el estado de un item individual del pedido
 * @access Private
 */
router.patch(
  '/items/:itemId/estado',
  authenticate,
  pedidosController.actualizarEstadoItem.bind(pedidosController)
);

/**
 * @route DELETE /pedidos/:id
 * @desc Eliminar un pedido
 * @access Private
 */
router.delete(
  '/:id',
  authenticate,
  pedidosController.eliminar.bind(pedidosController)
);

export default router;

