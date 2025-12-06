import { Router } from 'express';

const router = Router();

// TODO: Implementar rutas de logs

/**
 * @route GET /api/logs
 * @description Lista logs del sistema con filtros opcionales (paginación, nivel, categoría, fechas, etc.)
 * @access Privado (requiere autenticación)
 * @query page - Número de página (default: 1)
 * @query limit - Resultados por página (default: 10, max: 100)
 * @query nivel - Filtrar por nivel: ERROR, WARN, INFO, DEBUG
 * @query categoria - Filtrar por categoría: autenticacion, autorizacion, api, base_datos, negocio, sistema, seguridad
 * @query restauranteId - Filtrar por restaurante (UUID)
 * @query usuarioId - Filtrar por usuario (UUID)
 * @query fechaDesde - Fecha desde (ISO 8601)
 * @query fechaHasta - Fecha hasta (ISO 8601)
 */
router.get('/', (req, res) => {
  res.json({ message: 'Listar logs - Por implementar' });
});

/**
 * @route GET /api/logs/:id
 * @description Obtiene los detalles de un log específico por su ID
 * @access Privado (requiere autenticación)
 * @param id - ID del log (UUID)
 */
router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener log - Por implementar' });
});

export default router;

