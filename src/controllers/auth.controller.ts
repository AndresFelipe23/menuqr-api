import { BaseController } from './base.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import { getClientIp } from '../utils/helpers';

export class AuthController extends BaseController {
  private authService = new AuthService();

  /**
   * Inicia sesión
   */
  public login = this.asyncHandler(async (req, res) => {
    const loginDto = this.getBody<LoginDto>(req);
    const result = await this.authService.login(loginDto, {
      metodoHttp: req.method,
      ruta: req.originalUrl || req.path, // Usar originalUrl para incluir /api/auth/login
      endpoint: 'AuthController.login',
      direccionIp: getClientIp(req),
      agenteUsuario: req.get('user-agent') || undefined,
    });

    return this.responseUtil.success(res, result, 'Sesión iniciada exitosamente', 200);
  });

  /**
   * Registra un nuevo usuario
   */
  public register = this.asyncHandler(async (req, res) => {
    const registerDto = this.getBody<RegisterDto>(req);
    const result = await this.authService.register(registerDto, {
      metodoHttp: req.method,
      ruta: req.originalUrl || req.path, // Usar originalUrl para incluir /api/auth/register
      endpoint: 'AuthController.register',
      direccionIp: getClientIp(req),
      agenteUsuario: req.get('user-agent') || undefined,
    });

    return this.responseUtil.success(res, result, 'Usuario registrado exitosamente', 201);
  });

  /**
   * Renueva el token de acceso
   */
  public refresh = this.asyncHandler(async (req, res) => {
    const refreshTokenDto = this.getBody<RefreshTokenDto>(req);
    const tokens = await this.authService.refreshToken(refreshTokenDto, {
      metodoHttp: req.method,
      ruta: req.originalUrl || req.path, // Usar originalUrl para incluir /api/auth/refresh
      endpoint: 'AuthController.refresh',
      direccionIp: getClientIp(req),
      agenteUsuario: req.get('user-agent') || undefined,
    });

    return this.responseUtil.success(res, tokens, 'Token renovado exitosamente', 200);
  });
}

