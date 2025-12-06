import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateDto } from '../middlewares/validation.middleware';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/login
 * @description Inicia sesión con email y contraseña, retorna token JWT
 * @access Público
 * @body { email: string, password: string }
 */
router.post('/login', validateDto(LoginDto), authController.login);

/**
 * @route POST /api/auth/register
 * @description Registra un nuevo usuario en el sistema
 * @access Público
 * @body { email: string, password: string, nombre: string, rolId?: string }
 */
router.post('/register', validateDto(RegisterDto), authController.register);

/**
 * @route POST /api/auth/refresh
 * @description Renueva el token de acceso usando un refresh token válido
 * @access Público (solo requiere refresh token en body)
 * @body { refreshToken: string }
 */
router.post('/refresh', validateDto(RefreshTokenDto), authController.refresh);

export default router;

