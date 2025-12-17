import { Router } from 'express';
import { ReservasController } from '../controllers/reservas.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearReservaDto, ActualizarReservaDto } from '../dto';

const router = Router();
const reservasController = new ReservasController();

/**
 * @route GET /api/reservas/public/confirmar/:codigo
 * @description Confirma una reserva por código (público, no requiere autenticación)
 * @access Público
 */
router.get('/public/confirmar/:codigo', reservasController.confirmarPorCodigo);

// Todas las rutas siguientes requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/reservas
 * @description Obtiene todas las reservas con paginación y filtros
 * @access Protegido (requiere autenticación y plan PREMIUM)
 */
router.get('/', reservasController.obtenerTodas);

/**
 * @route GET /api/reservas/:id
 * @description Obtiene una reserva por ID
 * @access Protegido (requiere autenticación y plan PREMIUM)
 */
router.get('/:id', reservasController.obtenerPorId);

/**
 * @route POST /api/reservas
 * @description Crea una nueva reserva
 * @access Protegido (requiere autenticación y plan PREMIUM)
 * @body { restauranteId: string, mesaId: string, nombreCliente: string, correoCliente: string, telefonoCliente: string, fechaReserva: string, numeroPersonas?: number, notasCliente?: string, meseroAsignadoId?: string }
 */
router.post('/', validateDto(CrearReservaDto), reservasController.crear);

/**
 * @route PUT /api/reservas/:id
 * @description Actualiza una reserva
 * @access Protegido (requiere autenticación y plan PREMIUM)
 * @body { mesaId?: string, nombreCliente?: string, correoCliente?: string, telefonoCliente?: string, fechaReserva?: string, numeroPersonas?: number, estado?: string, notasCliente?: string, notasInternas?: string, meseroAsignadoId?: string, confirmada?: boolean, cancelada?: boolean, motivoCancelacion?: string, fechaLlegada?: string, fechaSalida?: string }
 */
router.put('/:id', validateDto(ActualizarReservaDto), reservasController.actualizar);

/**
 * @route DELETE /api/reservas/:id
 * @description Elimina una reserva (soft delete)
 * @access Protegido (requiere autenticación y plan PREMIUM)
 */
router.delete('/:id', reservasController.eliminar);

export default router;

