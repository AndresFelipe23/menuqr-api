import { Router } from 'express';
import { MesasController } from '../controllers/mesas.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearMesaDto, ActualizarMesaDto } from '../dto';

const router = Router();
const mesasController = new MesasController();

/**
 * @route GET /api/mesas/public/restaurante/:restauranteId
 * @description Obtiene todas las mesas activas de un restaurante específico (público, no requiere autenticación)
 * @access Público
 */
router.get('/public/restaurante/:restauranteId', mesasController.obtenerPorRestauranteIdPublico);

// Todas las rutas siguientes requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/mesas
 * @description Obtiene todas las mesas con paginación y filtros
 * @access Protegido (requiere autenticación)
 */
router.get('/', mesasController.obtenerTodos);

/**
 * @route GET /api/mesas/restaurante/:restauranteId
 * @description Obtiene todas las mesas de un restaurante específico
 * @access Protegido (requiere autenticación)
 */
router.get('/restaurante/:restauranteId', mesasController.obtenerPorRestauranteId);

/**
 * @route GET /api/mesas/:id
 * @description Obtiene una mesa por ID
 * @access Protegido (requiere autenticación)
 */
router.get('/:id', mesasController.obtenerPorId);

/**
 * @route POST /api/mesas
 * @description Crea una nueva mesa
 * @access Protegido (requiere autenticación)
 * @body { restauranteId: string, numero: string, nombre?: string, codigoQr?: string, imagenQrUrl?: string, capacidad?: number, seccion?: string, piso?: number, meseroAsignadoId?: string, activa?: boolean, ocupada?: boolean }
 */
router.post('/', validateDto(CrearMesaDto), mesasController.crear);

/**
 * @route PUT /api/mesas/:id
 * @description Actualiza una mesa
 * @access Protegido (requiere autenticación)
 * @body { numero?: string, nombre?: string, codigoQr?: string, imagenQrUrl?: string, capacidad?: number, seccion?: string, piso?: number, meseroAsignadoId?: string, activa?: boolean, ocupada?: boolean }
 */
router.put('/:id', validateDto(ActualizarMesaDto), mesasController.actualizar);

/**
 * @route POST /api/mesas/:id/regenerar-qr
 * @description Regenera el código QR y la imagen QR de una mesa
 * @access Protegido (requiere autenticación)
 */
router.post('/:id/regenerar-qr', mesasController.regenerarQR);

/**
 * @route DELETE /api/mesas/:id
 * @description Elimina una mesa (solo si no tiene pedidos activos)
 * @access Protegido (requiere autenticación)
 */
router.delete('/:id', mesasController.eliminar);

export default router;

