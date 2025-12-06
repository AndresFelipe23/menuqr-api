import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../config/database';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { jwtConfig } from '../config/jwt.config';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import { JwtPayload } from '../types';
import { AppError } from '../middlewares/errorHandler';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Permiso {
  codigo: string;
  nombre: string;
  modulo: string | null;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
    restauranteId?: string;
    rolId: string;
    rolNombre: string;
    permisos: Permiso[];
  };
  tokens: AuthTokens;
}

export class AuthService extends BaseService {
  protected logCategory = LogCategory.AUTHENTICACION;

  /**
   * Inicia sesión con email y contraseña
   */
  async login(loginDto: LoginDto, requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }): Promise<AuthResponse> {
    // Log inicial del intento de login
    this.logger.info(`Intento de login iniciado para: ${loginDto.email}`, {
      categoria: this.logCategory,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      detalle: { email: loginDto.email }
    });

    // Buscar usuario por email con permisos
    const usuario = await AppDataSource.query(
      `SELECT 
        u.id, u.correo, u.hash_contrasena, u.nombre, u.restaurante_id, u.activo,
        ru.rol_id,
        r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ru.rol_id
      WHERE u.correo = @0 AND u.fecha_eliminacion IS NULL`,
      [loginDto.email]
    );

    if (!usuario || usuario.length === 0) {
      // Log de error: usuario no encontrado
      this.logger.error('Login fallido: Credenciales inválidas - Usuario no encontrado', new Error('Usuario no encontrado'), {
        categoria: this.logCategory,
        metodoHttp: requestInfo?.metodoHttp,
        ruta: requestInfo?.ruta,
        endpoint: requestInfo?.endpoint,
        direccionIp: requestInfo?.direccionIp,
        agenteUsuario: requestInfo?.agenteUsuario,
        codigoEstadoHttp: 401,
        codigoError: 'INVALID_CREDENTIALS',
        detalle: { email: loginDto.email, razon: 'Usuario no encontrado' }
      });
      throw new AppError('Credenciales inválidas', 401);
    }

    const user = usuario[0];

    // Verificar que el usuario esté activo
    if (!user.activo) {
      // Log de error: usuario inactivo
      this.logger.error('Login fallido: Usuario inactivo', new Error('Usuario inactivo'), {
        categoria: this.logCategory,
        usuarioId: user.id,
        restauranteId: user.restaurante_id,
        metodoHttp: requestInfo?.metodoHttp,
        ruta: requestInfo?.ruta,
        endpoint: requestInfo?.endpoint,
        direccionIp: requestInfo?.direccionIp,
        agenteUsuario: requestInfo?.agenteUsuario,
        codigoEstadoHttp: 403,
        codigoError: 'USER_INACTIVE',
        detalle: { email: loginDto.email, usuarioId: user.id, razon: 'Usuario inactivo' }
      });
      throw new AppError('Usuario inactivo', 403);
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(loginDto.password, user.hash_contrasena);
    if (!passwordMatch) {
      // Log de error: contraseña incorrecta
      this.logger.error('Login fallido: Credenciales inválidas - Contraseña incorrecta', new Error('Contraseña incorrecta'), {
        categoria: this.logCategory,
        usuarioId: user.id,
        restauranteId: user.restaurante_id,
        metodoHttp: requestInfo?.metodoHttp,
        ruta: requestInfo?.ruta,
        endpoint: requestInfo?.endpoint,
        direccionIp: requestInfo?.direccionIp,
        agenteUsuario: requestInfo?.agenteUsuario,
        codigoEstadoHttp: 401,
        codigoError: 'INVALID_CREDENTIALS',
        detalle: { email: loginDto.email, usuarioId: user.id, razon: 'Contraseña incorrecta' }
      });
      throw new AppError('Credenciales inválidas', 401);
    }

    // Generar tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.correo,
      rolId: user.rol_id || '',
      restauranteId: user.restaurante_id || undefined,
    });

    // Generar ID de sesión único para rastrear la sesión
    const sessionId = randomUUID();

    // Obtener permisos del usuario
    let permisos: Array<{ codigo: string; nombre: string; modulo: string | null }> = [];
    if (user.rol_id) {
      const permisosData = await AppDataSource.query(
        `SELECT 
          p.codigo,
          p.nombre,
          p.modulo
        FROM permisos p
        INNER JOIN roles_permisos rp ON rp.permiso_id = p.id
        WHERE rp.rol_id = @0 AND p.activo = 1
        ORDER BY p.modulo, p.codigo`,
        [user.rol_id]
      );
      permisos = permisosData.map((p: any) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        modulo: p.modulo,
      }));
    }

    // Actualizar último acceso
    await AppDataSource.query(
      `UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id = @0`,
      [user.id]
    );

    // Log de éxito con contexto completo para auditoría
    this.logger.info('Login exitoso', {
      categoria: this.logCategory,
      usuarioId: user.id,
      restauranteId: user.restaurante_id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      idSesion: sessionId,
      entidadTipo: 'usuario',
      entidadId: user.id,
      codigoEstadoHttp: 200,
      detalle: {
        email: user.correo,
        nombre: user.nombre,
        rolId: user.rol_id || null,
        rolNombre: user.rol_nombre || 'Sin rol',
        restauranteId: user.restaurante_id || null,
        totalPermisos: permisos.length,
      },
      metadata: {
        tipoLogin: 'email_password',
        timestamp: new Date().toISOString(),
      }
    });

    return {
      user: {
        id: user.id,
        email: user.correo,
        nombre: user.nombre,
        restauranteId: user.restaurante_id,
        rolId: user.rol_id || '',
        rolNombre: user.rol_nombre || 'Sin rol',
        permisos: permisos,
      },
      tokens,
    };
  }

  /**
   * Registra un nuevo usuario
   * 
   * Lógica multi-tenant:
   * - Si no viene restauranteId: Crea restaurante + usuario como Administrador
   * - Si viene restauranteId: Crea usuario para ese restaurante (usado por admins)
   */
  async register(registerDto: RegisterDto, requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }): Promise<AuthResponse> {
    // Log inicial del intento de registro
    this.logger.info(`Intento de registro iniciado para: ${registerDto.email}`, {
      categoria: this.logCategory,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      detalle: { email: registerDto.email, tieneRestauranteId: !!registerDto.restauranteId }
    });

    // Verificar si el email ya existe
    const existingUser = await AppDataSource.query(
      `SELECT id FROM usuarios WHERE correo = @0 AND fecha_eliminacion IS NULL`,
      [registerDto.email]
    );

    if (existingUser && existingUser.length > 0) {
      this.logger.error('Registro fallido: Email ya registrado', new Error('Email duplicado'), {
        categoria: this.logCategory,
        metodoHttp: requestInfo?.metodoHttp,
        ruta: requestInfo?.ruta,
        endpoint: requestInfo?.endpoint,
        direccionIp: requestInfo?.direccionIp,
        agenteUsuario: requestInfo?.agenteUsuario,
        codigoEstadoHttp: 409,
        codigoError: 'EMAIL_ALREADY_EXISTS',
        detalle: { email: registerDto.email }
      });
      this.handleError('El email ya está registrado', null, 409);
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(registerDto.password, saltRounds);

    let restauranteId: string | undefined = undefined;
    let rolId: string | null = null;
    let esRegistroNuevoRestaurante = false;

    // CASO 1: Registro público - Crear restaurante + usuario administrador
    if (!registerDto.restauranteId) {
      // Validar que vengan los datos del restaurante
      if (!registerDto.nombreRestaurante || !registerDto.slugRestaurante) {
        this.handleError('Para registrarse como nuevo restaurante, debe proporcionar nombreRestaurante y slugRestaurante', null, 400);
      }

      // Verificar que el slug del restaurante no exista
      const slugExiste = await AppDataSource.query(
        `SELECT id FROM restaurantes WHERE slug = @0 AND fecha_eliminacion IS NULL`,
        [registerDto.slugRestaurante]
      );

      if (slugExiste && slugExiste.length > 0) {
        this.logger.error('Registro fallido: Slug de restaurante ya existe', new Error('Slug duplicado'), {
          categoria: this.logCategory,
          metodoHttp: requestInfo?.metodoHttp,
          ruta: requestInfo?.ruta,
          endpoint: requestInfo?.endpoint,
          direccionIp: requestInfo?.direccionIp,
          agenteUsuario: requestInfo?.agenteUsuario,
          codigoEstadoHttp: 409,
          codigoError: 'RESTAURANT_SLUG_EXISTS',
          detalle: { slug: registerDto.slugRestaurante }
        });
        this.handleError('Ya existe un restaurante con ese slug', null, 409);
      }

      // Verificar que el email no esté en uso como correo de restaurante
      const emailRestauranteExiste = await AppDataSource.query(
        `SELECT id FROM restaurantes WHERE correo = @0 AND fecha_eliminacion IS NULL`,
        [registerDto.email]
      );

      if (emailRestauranteExiste && emailRestauranteExiste.length > 0) {
        this.handleError('El correo electrónico ya está registrado como restaurante', null, 409);
      }

      // Crear restaurante con fechas en hora local de Montería
      const { getMonteriaLocalDate } = await import('../utils/date.utils');
      const fechaActual = getMonteriaLocalDate();
      
      const restauranteResult = await AppDataSource.query(
        `INSERT INTO restaurantes (nombre, slug, correo, activo, estado_suscripcion, fecha_creacion, fecha_actualizacion)
         OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.slug
         VALUES (@0, @1, @2, 1, 'free', @3, @3)`,
        [registerDto.nombreRestaurante, registerDto.slugRestaurante, registerDto.email, fechaActual]
      );

      if (!restauranteResult || restauranteResult.length === 0) {
        this.handleError('Error al crear restaurante', null, 500);
      }

      restauranteId = restauranteResult[0].id;
      esRegistroNuevoRestaurante = true;

      // Crear suscripción FREE automáticamente (permanente)
      const { SuscripcionesService } = await import('./suscripciones.service');
      const suscripcionesService = new SuscripcionesService();
      try {
        await suscripcionesService.crear({
          restauranteId,
          tipoPlan: 'free',
        }, undefined, requestInfo);
      } catch (error: any) {
        // Si falla la creación de suscripción, loguear pero no fallar el registro
        this.logger.warn('Error al crear suscripción FREE automática', {
          categoria: this.logCategory,
          restauranteId,
          error: error.message,
        });
      }

      // Obtener rol "Administrador" para asignarlo al usuario
      const adminRole = await AppDataSource.query(
        `SELECT id FROM roles WHERE nombre = 'Administrador'`
      );

      if (!adminRole || adminRole.length === 0) {
        this.handleError('El rol Administrador no existe en el sistema', null, 500);
      }

      rolId = adminRole[0].id;

      this.logger.info('Restaurante creado durante registro', {
        categoria: this.logCategory,
        restauranteId,
        detalle: {
          nombre: registerDto.nombreRestaurante,
          slug: registerDto.slugRestaurante,
          email: registerDto.email
        }
      });

    } else {
      // CASO 2: Un administrador está creando usuarios para su restaurante
      restauranteId = registerDto.restauranteId;

      // Verificar que el restaurante exista
      const restaurante = await AppDataSource.query(
        `SELECT id, nombre FROM restaurantes WHERE id = @0 AND fecha_eliminacion IS NULL AND activo = 1`,
        [restauranteId]
      );

      if (!restaurante || restaurante.length === 0) {
        this.handleError('El restaurante especificado no existe o está inactivo', null, 404);
      }

      // Si se especifica un rol, usarlo; sino, no asignar rol (el admin lo asignará después)
      if (registerDto.rolId) {
        rolId = registerDto.rolId;
        
        // Verificar que el rol exista
        const rol = await AppDataSource.query(
          `SELECT id, nombre FROM roles WHERE id = @0`,
          [rolId]
        );

        if (!rol || rol.length === 0) {
          this.handleError('El rol especificado no existe', null, 404);
        }
      }
    }

    // Crear usuario
    const result = await AppDataSource.query(
      `INSERT INTO usuarios (correo, hash_contrasena, nombre, restaurante_id, activo)
       OUTPUT INSERTED.id, INSERTED.correo, INSERTED.nombre, INSERTED.restaurante_id
       VALUES (@0, @1, @2, @3, 1)`,
      [registerDto.email, hashPassword, registerDto.nombre, restauranteId]
    );

    if (!result || result.length === 0) {
      this.handleError('Error al crear usuario', null, 500);
    }

    const newUser = result[0];

    // Asignar rol al usuario si se especificó
    if (rolId) {
      await AppDataSource.query(
        `INSERT INTO roles_usuario (usuario_id, rol_id, restaurante_id)
         VALUES (@0, @1, @2)`,
        [newUser.id, rolId, restauranteId]
      );
    }

    // Obtener información del rol
    let roleInfo: any[] = [];
    if (rolId) {
      roleInfo = await AppDataSource.query(
        `SELECT nombre FROM roles WHERE id = @0`,
        [rolId]
      );
    }

    // Generar tokens
    const tokens = this.generateTokens({
      userId: newUser.id,
      email: newUser.correo,
      rolId: rolId || '',
      restauranteId: restauranteId || undefined,
    });

    // Obtener permisos del usuario
    let permisos: Array<{ codigo: string; nombre: string; modulo: string | null }> = [];
    if (rolId) {
      const permisosData = await AppDataSource.query(
        `SELECT 
          p.codigo,
          p.nombre,
          p.modulo
        FROM permisos p
        INNER JOIN roles_permisos rp ON rp.permiso_id = p.id
        WHERE rp.rol_id = @0 AND p.activo = 1
        ORDER BY p.modulo, p.codigo`,
        [rolId]
      );
      permisos = permisosData.map((p: any) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        modulo: p.modulo,
      }));
    }

    // Log de éxito con contexto completo
    this.logger.info('Usuario registrado exitosamente', {
      categoria: this.logCategory,
      usuarioId: newUser.id,
      restauranteId: newUser.restaurante_id,
      metodoHttp: requestInfo?.metodoHttp,
      ruta: requestInfo?.ruta,
      endpoint: requestInfo?.endpoint,
      direccionIp: requestInfo?.direccionIp,
      agenteUsuario: requestInfo?.agenteUsuario,
      idSesion: randomUUID(),
      entidadTipo: 'usuario',
      entidadId: newUser.id,
      codigoEstadoHttp: 201,
      detalle: {
        email: newUser.correo,
        nombre: newUser.nombre,
        rolId: rolId || null,
        restauranteId: restauranteId,
        esRegistroNuevoRestaurante,
        totalPermisos: permisos.length,
      },
      metadata: {
        tipoRegistro: esRegistroNuevoRestaurante ? 'nuevo_restaurante' : 'usuario_existente',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.correo,
        nombre: newUser.nombre,
        restauranteId: restauranteId || undefined,
        rolId: rolId || '',
        rolNombre: roleInfo && roleInfo.length > 0 ? roleInfo[0].nombre : 'Sin rol',
        permisos: permisos,
      },
      tokens,
    };
  }

  /**
   * Renueva el token de acceso usando refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto, requestInfo?: { metodoHttp?: string; ruta?: string; direccionIp?: string; endpoint?: string; agenteUsuario?: string }): Promise<AuthTokens> {
    // Log solo en consola para operaciones normales
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] [${this.logCategory}] Renovando token`);
    }

    try {
      // Verificar y decodificar refresh token
      const decoded = jwt.verify(refreshTokenDto.refreshToken, jwtConfig.refreshSecret) as JwtPayload;

      // Buscar usuario
      const usuario = await AppDataSource.query(
        `SELECT 
          u.id, u.correo, u.activo, u.restaurante_id,
          ru.rol_id
        FROM usuarios u
        LEFT JOIN roles_usuario ru ON ru.usuario_id = u.id
        WHERE u.id = @0 AND u.fecha_eliminacion IS NULL`,
        [decoded.userId]
      );

      if (!usuario || usuario.length === 0) {
        this.handleError('Usuario no encontrado', null, 404);
      }

      const user = usuario[0];

      if (!user.activo) {
        this.handleError('Usuario inactivo', null, 403);
      }

      // Generar nuevos tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.correo,
        rolId: user.rol_id || '',
        restauranteId: user.restaurante_id || undefined,
      });

      // Log de éxito con contexto
      this.logger.info('Token renovado exitosamente', {
        categoria: this.logCategory,
        usuarioId: user.id,
        metodoHttp: requestInfo?.metodoHttp,
        ruta: requestInfo?.ruta,
        endpoint: requestInfo?.endpoint,
        direccionIp: requestInfo?.direccionIp,
        agenteUsuario: requestInfo?.agenteUsuario,
        codigoEstadoHttp: 200,
      });

      return tokens;
    } catch (error) {
      this.handleError('Refresh token inválido o expirado', error, 401);
    }
  }

  /**
   * Genera tokens de acceso y refresh
   */
  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = jwt.sign(
      payload,
      jwtConfig.secret as Secret,
      {
        expiresIn: jwtConfig.expiresIn as SignOptions['expiresIn'],
      }
    );

    const refreshToken = jwt.sign(
      payload,
      jwtConfig.refreshSecret as Secret,
      {
        expiresIn: jwtConfig.refreshExpiresIn as SignOptions['expiresIn'],
      }
    );

    // Calcular tiempo de expiración en segundos
    const expiresIn = this.parseExpiresIn(jwtConfig.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Parsea el tiempo de expiración a segundos
   */
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 24 * 60 * 60; // 24 horas por defecto
    }
  }
}

