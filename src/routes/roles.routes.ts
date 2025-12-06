import { Router } from 'express';
import { RolesController } from '../controllers/roles.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearRolDto, ActualizarRolDto, AsignarPermisosDto } from '../dto';

const router = Router();
const rolesController = new RolesController();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/roles
 * @description Obtiene todos los roles con sus permisos
 * @access Protegido (requiere autenticación)
 */
router.get('/', rolesController.obtenerTodos);

/**
 * @route GET /api/roles/permisos
 * @description Obtiene todos los permisos disponibles del sistema
 * @access Protegido (requiere autenticación)
 */
router.get('/permisos', rolesController.obtenerPermisosDisponibles);

/**
 * @route GET /api/roles/:id
 * @description Obtiene un rol por ID con sus permisos
 * @access Protegido (requiere autenticación)
 */
router.get('/:id', rolesController.obtenerPorId);

/**
 * @route POST /api/roles
 * @description Crea un nuevo rol
 * @access Protegido (requiere autenticación)
 * @body { nombre: string, descripcion?: string }
 */
router.post('/', validateDto(CrearRolDto), rolesController.crear);

/**
 * @route PUT /api/roles/:id
 * @description Actualiza un rol
 * @access Protegido (requiere autenticación)
 * @body { nombre?: string, descripcion?: string }
 */
router.put('/:id', validateDto(ActualizarRolDto), rolesController.actualizar);

/**
 * @route DELETE /api/roles/:id
 * @description Elimina un rol (solo si no está asignado a usuarios)
 * @access Protegido (requiere autenticación)
 */
router.delete('/:id', rolesController.eliminar);

/**
 * @route POST /api/roles/:id/permisos
 * @description Asigna permisos a un rol (reemplaza los permisos existentes)
 * @access Protegido (requiere autenticación)
 * @body { permisoIds: string[] }
 */
router.post('/:id/permisos', validateDto(AsignarPermisosDto), rolesController.asignarPermisos);

export default router;

