import { Router } from 'express';
import { UsuariosController } from '../controllers/usuarios.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { CrearUsuarioDto, ActualizarUsuarioDto } from '../dto';

const router = Router();
const usuariosController = new UsuariosController();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/usuarios
 * @description Obtiene todos los usuarios con paginación y filtros
 * @access Protegido (requiere autenticación)
 */
router.get('/', usuariosController.obtenerTodos);

/**
 * @route GET /api/usuarios/restaurante/:restauranteId
 * @description Obtiene todos los usuarios de un restaurante específico
 * @access Protegido (requiere autenticación)
 */
router.get('/restaurante/:restauranteId', usuariosController.obtenerPorRestauranteId);

/**
 * @route GET /api/usuarios/:id
 * @description Obtiene un usuario por ID
 * @access Protegido (requiere autenticación)
 */
router.get('/:id', usuariosController.obtenerPorId);

/**
 * @route POST /api/usuarios
 * @description Crea un nuevo usuario
 * @access Protegido (requiere autenticación)
 * @body { correo: string, password: string, nombre?: string, apellido?: string, telefono?: string, avatarUrl?: string, restauranteId?: string, rolId?: string, activo?: boolean, correoVerificado?: boolean }
 */
router.post('/', validateDto(CrearUsuarioDto), usuariosController.crear);

/**
 * @route PUT /api/usuarios/:id
 * @description Actualiza un usuario
 * @access Protegido (requiere autenticación)
 * @body { correo?: string, password?: string, nombre?: string, apellido?: string, telefono?: string, avatarUrl?: string, restauranteId?: string, rolId?: string, activo?: boolean, correoVerificado?: boolean }
 */
router.put('/:id', validateDto(ActualizarUsuarioDto), usuariosController.actualizar);

/**
 * @route DELETE /api/usuarios/:id
 * @description Elimina un usuario (soft delete)
 * @access Protegido (requiere autenticación)
 */
router.delete('/:id', usuariosController.eliminar);

export default router;

