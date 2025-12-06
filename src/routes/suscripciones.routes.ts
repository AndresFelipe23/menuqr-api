import { Router } from 'express';
import { SuscripcionesController } from '../controllers/suscripciones.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearSuscripcionDto, ActualizarSuscripcionDto } from '../dto';

const router = Router();
const suscripcionesController = new SuscripcionesController();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/suscripciones/restaurante/:restauranteId
 * @description Obtiene la suscripción de un restaurante
 * @access Protegido (requiere autenticación)
 */
router.get('/restaurante/:restauranteId', suscripcionesController.obtenerPorRestauranteId);

/**
 * @route GET /api/suscripciones/restaurante/:restauranteId/limites
 * @description Verifica los límites de un plan
 * @access Protegido (requiere autenticación)
 * @query tipo - Tipo de límite a verificar (items, mesas, usuarios)
 */
router.get('/restaurante/:restauranteId/limites', suscripcionesController.verificarLimites);

/**
 * @route GET /api/suscripciones/wompi/payment-link
 * @description Obtiene el link de pago de Wompi para un plan
 * @access Protegido (requiere autenticación)
 * @query plan - Tipo de plan (pro o premium)
 * @query annual - Si es plan anual (true/false)
 */
router.get('/wompi/payment-link', suscripcionesController.obtenerWompiPaymentLink);

/**
 * @route POST /api/suscripciones
 * @description Crea una nueva suscripción
 * @access Protegido (requiere autenticación)
 * @body { restauranteId: string, tipoPlan: 'trial' | 'basic' | 'premium' | 'enterprise', paymentMethodId?: string }
 */
router.post('/', validateDto(CrearSuscripcionDto), suscripcionesController.crear);

/**
 * @route PUT /api/suscripciones/:id
 * @description Actualiza una suscripción
 * @access Protegido (requiere autenticación)
 * @body { tipoPlan?: string, cancelarAlFinPeriodo?: boolean }
 */
router.put('/:id', validateDto(ActualizarSuscripcionDto), suscripcionesController.actualizar);

export default router;

