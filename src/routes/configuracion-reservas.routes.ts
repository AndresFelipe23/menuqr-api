import { Router } from 'express';
import { ConfiguracionReservasController } from '../controllers/configuracion-reservas.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearConfiguracionReservasDto, ActualizarConfiguracionReservasDto } from '../dto';

const router = Router();
const configuracionReservasController = new ConfiguracionReservasController();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/configuracion-reservas/restaurante/:restauranteId
 * @description Obtiene la configuración de reservas de un restaurante
 * @access Protegido (requiere autenticación y plan PREMIUM)
 */
router.get('/restaurante/:restauranteId', configuracionReservasController.obtenerPorRestauranteId);

/**
 * @route POST /api/configuracion-reservas
 * @description Crea o actualiza la configuración de reservas (si ya existe, la actualiza)
 * @access Protegido (requiere autenticación y plan PREMIUM)
 * @body { reservasHabilitadas?: boolean, horaAperturaLunes?: string, horaCierreLunes?: string, ... }
 */
router.post('/', validateDto(CrearConfiguracionReservasDto), configuracionReservasController.crearOActualizar);

/**
 * @route PUT /api/configuracion-reservas
 * @description Actualiza la configuración de reservas
 * @access Protegido (requiere autenticación y plan PREMIUM)
 * @body { reservasHabilitadas?: boolean, horaAperturaLunes?: string, horaCierreLunes?: string, ... }
 */
router.put('/', validateDto(ActualizarConfiguracionReservasDto), configuracionReservasController.actualizar);

export default router;

