import { Router } from 'express';
import { ComentariosController } from '../controllers/comentarios.controller';
import { validateDto, validateQuery } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearComentarioDto, ActualizarComentarioDto, QueryComentarioDto } from '../dto';

const router = Router();
const comentariosController = new ComentariosController();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/comentarios
 * @description Lista todos los comentarios con paginación y filtros opcionales
 * @access Protegido (requiere autenticación)
 * @query page - Número de página (default: 1)
 * @query limit - Resultados por página (default: 10)
 * @query restauranteId - Filtrar por restauranteId (UUID)
 * @query usuarioId - Filtrar por usuarioId (UUID)
 * @query tipo - Filtrar por tipo (comentario, queja, solicitud, sugerencia, pregunta)
 * @query estado - Filtrar por estado (pendiente, en_proceso, resuelto, cerrado)
 * @query prioridad - Filtrar por prioridad (baja, normal, alta, urgente)
 * @query asunto - Filtrar por asunto (búsqueda parcial)
 * @query orden - Orden de visualización (asc/desc, default: desc)
 */
router.get('/', validateQuery(QueryComentarioDto), comentariosController.obtenerTodos);

/**
 * @route GET /api/comentarios/:id
 * @description Obtiene un comentario por ID
 * @access Protegido (requiere autenticación)
 * @param id - ID del comentario (UUID)
 */
router.get('/:id', comentariosController.obtenerPorId);

/**
 * @route POST /api/comentarios
 * @description Crea un nuevo comentario, queja o solicitud
 * @access Protegido (requiere autenticación)
 * @body { tipo: string, asunto: string, mensaje: string, restauranteId?: string, prioridad?: string }
 */
router.post('/', validateDto(CrearComentarioDto), comentariosController.crear);

/**
 * @route PUT /api/comentarios/:id
 * @description Actualiza un comentario existente
 * @access Protegido (requiere autenticación)
 * @body { tipo?: string, asunto?: string, mensaje?: string, estado?: string, respuesta?: string, prioridad?: string }
 */
router.put('/:id', validateDto(ActualizarComentarioDto), comentariosController.actualizar);

/**
 * @route POST /api/comentarios/:id/responder
 * @description Responde a un comentario
 * @access Protegido (requiere autenticación)
 * @param id - ID del comentario (UUID)
 * @body { respuesta: string }
 */
router.post('/:id/responder', comentariosController.responder);

/**
 * @route DELETE /api/comentarios/:id
 * @description Elimina un comentario (soft delete)
 * @access Protegido (requiere autenticación)
 * @param id - ID del comentario (UUID)
 */
router.delete('/:id', comentariosController.eliminar);

export default router;

