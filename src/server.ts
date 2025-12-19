import 'reflect-metadata';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { initializeFirebase } from './config/firebase.config';
import { initializeSocketIO } from './config/socket.config';
import { initEmailTransport } from './config/email.config';

// Importar rutas
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import logsRoutes from './routes/logs.routes';
import rolesRoutes from './routes/roles.routes';
import enlacesRoutes from './routes/enlaces.routes';
import categoriasRoutes from './routes/categorias.routes';
import mesasRoutes from './routes/mesas.routes';
import usuariosRoutes from './routes/usuarios.routes';
import itemsMenuRoutes from './routes/items-menu.routes';
import adicionesRoutes from './routes/adiciones.routes';
import pedidosRoutes from './routes/pedidos.routes';
import storageRoutes from './routes/storage.routes';
import suscripcionesRoutes from './routes/suscripciones.routes';
import webhooksRoutes from './routes/webhooks.routes';
import comentariosRoutes from './routes/comentarios.routes';
import reservasRoutes from './routes/reservas.routes';
import configuracionReservasRoutes from './routes/configuracion-reservas.routes';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5290;
const API_URL = process.env.API_URL || `http://localhost:${PORT}/api`;

// Configurar CORS ANTES de helmet para evitar conflictos
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4321'];

// En desarrollo, asegurar que los localhost comunes estén incluidos
const defaultDevOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4321'];
const finalCorsOrigins = isProduction
  ? corsOrigins
  : [...new Set([...corsOrigins, ...defaultDevOrigins])]; // Combinar y eliminar duplicados

// Log de orígenes permitidos en producción
if (isProduction) {
  console.log(`🔒 CORS en producción - Orígenes permitidos: ${finalCorsOrigins.join(', ')}`);
}

// Log de configuración de CORS para debugging
if (!isProduction) {
  console.log('🔓 CORS configurado en modo desarrollo - permitiendo todos los orígenes');
  console.log(`📍 Orígenes configurados: ${finalCorsOrigins.join(', ')}`);
}

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // En producción, solo permitir orígenes configurados
    if (isProduction) {
      // Verificar si el origen está en la lista o si se permite '*'
      if (finalCorsOrigins.includes(origin) || finalCorsOrigins.includes('*')) {
        console.log(`✅ CORS permitido (producción): ${origin}`);
        callback(null, true);
      } else {
        console.warn(`❌ CORS bloqueado en producción: ${origin}`);
        console.warn(`   Orígenes permitidos: ${finalCorsOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // En desarrollo, permitir todos los orígenes (más permisivo)
      if (!isProduction) {
        console.log(`✅ CORS permitido (desarrollo): ${origin}`);
      }
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 200 // Para navegadores legacy
}));

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // Necesario para Scalar y otros frameworks
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://cdn.skypack.dev"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Necesario para Scalar
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:"
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "http://localhost:*",
        "https://api.scalar.com",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "wss:", // Para WebSockets
        "ws:"   // Para WebSockets
      ],
      frameSrc: [
        "'self'"
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// IMPORTANTE: Registrar webhooks ANTES de express.json()
// Los webhooks de Stripe necesitan el body sin parsear (Buffer) para verificar la firma
app.use('/api/webhooks', webhooksRoutes);

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares de logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Scalar API Documentation - Se configurará dinámicamente en startServer()
// (Scalar es un módulo ESM y necesita import dinámico)

// Swagger JSON endpoint (para Scalar)
app.get('/api/docs.json', (req, res) => {
  // Headers para evitar caché
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Asegurar que siempre devolvemos los datos correctos de MenuQR
  const swaggerSpec = {
    openapi: '3.1.0',
    info: {
      title: 'MenuQR API',
      version: '1.0.0',
      description: 'API para Sistema de Menú QR - Gestión de restaurantes, menús y pedidos',
    },
    servers: [
      {
        url: process.env.API_URL 
          ? process.env.API_URL.replace('/api', '')
          : `http://localhost:${PORT}`,
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor de producción'
          : 'Servidor de desarrollo (las rutas ya incluyen /api)',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Endpoints de salud del servidor',
      },
      {
        name: 'Logs',
        description: 'Endpoints para gestionar y consultar logs del sistema',
      },
      {
        name: 'Auth',
        description: 'Endpoints de autenticación',
      },
      {
        name: 'Restaurants',
        description: 'Endpoints para gestión de restaurantes',
      },
      {
        name: 'Roles',
        description: 'Endpoints para gestión de roles y permisos',
      },
      {
        name: 'Enlaces',
        description: 'Endpoints para gestión de enlaces de restaurantes',
      },
      {
        name: 'Categorías',
        description: 'Endpoints para gestión de categorías de menú',
      },
      {
        name: 'Mesas',
        description: 'Endpoints para gestión de mesas del restaurante',
      },
      {
        name: 'Usuarios',
        description: 'Endpoints para gestión de usuarios del sistema',
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Verificar estado del servidor',
          description: 'Endpoint para verificar que el servidor está funcionando correctamente',
          responses: {
            '200': {
              description: 'Servidor funcionando correctamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                      environment: { type: 'string', example: 'development' },
                    },
                  },
                  examples: {
                    exito: {
                      summary: 'Servidor funcionando',
                      value: {
                        status: 'ok',
                        timestamp: '2024-01-15T10:30:00.000Z',
                        environment: 'development',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Iniciar sesión',
          description: 'Inicia sesión con email y contraseña, retorna tokens JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Ejemplo de login',
                    value: {
                      email: 'usuario@ejemplo.com',
                      password: 'password123',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Sesión iniciada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Sesión iniciada exitosamente' },
                      data: {
                        $ref: '#/components/schemas/AuthResponse',
                      },
                    },
                  },
                  examples: {
                    exito: {
                      summary: 'Login exitoso',
                      value: {
                        success: true,
                        message: 'Sesión iniciada exitosamente',
                        data: {
                          user: {
                            id: '123e4567-e89b-12d3-a456-426614174000',
                            email: 'usuario@ejemplo.com',
                            nombre: 'Juan Pérez',
                            restauranteId: '123e4567-e89b-12d3-a456-426614174001',
                            rolId: '123e4567-e89b-12d3-a456-426614174002',
                            rolNombre: 'Administrador',
                          },
                          tokens: {
                            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6InVzdWFyaW9AZWplbXBsby5jb20iLCJpYXQiOjE2NDAwMDAwMDB9.example',
                            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpYXQiOjE2NDAwMDAwMDB9.example',
                            expiresIn: 86400,
                          },
                        },
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Credenciales inválidas',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Credenciales inválidas' },
                      error: { type: 'string', example: 'INVALID_CREDENTIALS' },
                    },
                  },
                  examples: {
                    error: {
                      summary: 'Error de credenciales',
                      value: {
                        success: false,
                        message: 'Credenciales inválidas',
                        error: 'INVALID_CREDENTIALS',
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar usuario',
          description: 'Registra un nuevo usuario en el sistema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegisterDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Registro con rol por defecto',
                    value: {
                      email: 'nuevo@ejemplo.com',
                      password: 'password123',
                      nombre: 'María García',
                    },
                  },
                  ejemplo2: {
                    summary: 'Registro con rol y restaurante',
                    value: {
                      email: 'admin@restaurante.com',
                      password: 'securePassword123',
                      nombre: 'Pedro López',
                      rolId: '123e4567-e89b-12d3-a456-426614174002',
                      restauranteId: '123e4567-e89b-12d3-a456-426614174001',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Usuario registrado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuario registrado exitosamente' },
                      data: {
                        $ref: '#/components/schemas/AuthResponse',
                      },
                    },
                  },
                  examples: {
                    exito: {
                      summary: 'Usuario registrado',
                      value: {
                        success: true,
                        message: 'Usuario registrado exitosamente',
                        data: {
                          user: {
                            id: '123e4567-e89b-12d3-a456-426614174000',
                            email: 'nuevo@ejemplo.com',
                            nombre: 'María García',
                            restauranteId: null,
                            rolId: '123e4567-e89b-12d3-a456-426614174002',
                            rolNombre: 'Cliente',
                          },
                          tokens: {
                            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6Im51ZXZvQGVqZW1wbG8uY29tIiwiaWF0IjoxNjQwMDAwMDAwfQ.example',
                            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpYXQiOjE2NDAwMDAwMDB9.example',
                            expiresIn: 86400,
                          },
                        },
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
            '409': {
              description: 'El email ya está registrado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'El email ya está registrado' },
                      error: { type: 'string', example: 'DUPLICATE_ENTRY' },
                    },
                  },
                  examples: {
                    error: {
                      summary: 'Email duplicado',
                      value: {
                        success: false,
                        message: 'El email ya está registrado',
                        error: 'DUPLICATE_ENTRY',
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renovar token',
          description: 'Renueva el token de acceso usando un refresh token válido',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RefreshTokenDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Refresh token',
                    value: {
                      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpYXQiOjE2NDAwMDAwMDB9.example',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Token renovado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Token renovado exitosamente' },
                      data: {
                        $ref: '#/components/schemas/AuthTokens',
                      },
                    },
                  },
                  examples: {
                    exito: {
                      summary: 'Tokens renovados',
                      value: {
                        success: true,
                        message: 'Token renovado exitosamente',
                        data: {
                          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6InVzdWFyaW9AZWplbXBsby5jb20iLCJpYXQiOjE2NDAwMDAwMDB9.new_token',
                          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpYXQiOjE2NDAwMDAwMDB9.new_refresh_token',
                          expiresIn: 86400,
                        },
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Refresh token inválido o expirado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Refresh token inválido o expirado' },
                      error: { type: 'string', example: 'INVALID_TOKEN' },
                    },
                  },
                  examples: {
                    error: {
                      summary: 'Token inválido',
                      value: {
                        success: false,
                        message: 'Refresh token inválido o expirado',
                        error: 'INVALID_TOKEN',
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/logs': {
        get: {
          tags: ['Logs'],
          summary: 'Listar logs del sistema',
          description: 'Obtiene una lista paginada de logs del sistema con filtros opcionales',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Número de página',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
              description: 'Cantidad de resultados por página',
            },
            {
              name: 'nivel',
              in: 'query',
              schema: { type: 'string', enum: ['ERROR', 'WARN', 'INFO', 'DEBUG'] },
              description: 'Filtrar por nivel de log',
            },
            {
              name: 'categoria',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['autenticacion', 'autorizacion', 'api', 'base_datos', 'negocio', 'sistema', 'seguridad'],
              },
              description: 'Filtrar por categoría',
            },
            {
              name: 'restauranteId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Filtrar por restaurante',
            },
            {
              name: 'usuarioId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Filtrar por usuario',
            },
            {
              name: 'fechaDesde',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Fecha desde (ISO 8601)',
            },
            {
              name: 'fechaHasta',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Fecha hasta (ISO 8601)',
            },
          ],
          responses: {
            '200': {
              description: 'Lista de logs obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Log',
                        },
                      },
                      metadata: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          totalPages: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'No autorizado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'No autorizado' },
                      error: { type: 'string', example: 'UNAUTHORIZED' },
                    },
                  },
                  examples: {
                    error: {
                      summary: 'No autorizado',
                      value: {
                        success: false,
                        message: 'No autorizado',
                        error: 'UNAUTHORIZED',
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/logs/{id}': {
        get: {
          tags: ['Logs'],
          summary: 'Obtener un log por ID',
          description: 'Obtiene los detalles de un log específico',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del log',
            },
          ],
          responses: {
            '200': {
              description: 'Log obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        $ref: '#/components/schemas/Log',
                      },
                    },
                  },
                  examples: {
                    exito: {
                      summary: 'Log obtenido',
                      value: {
                        success: true,
                        message: 'Log obtenido exitosamente',
                        data: {
                          id: '123e4567-e89b-12d3-a456-426614174000',
                          nivel: 'ERROR',
                          categoria: 'base_datos',
                          mensaje: 'Error al ejecutar query SQL',
                          detalle: {
                            query: 'SELECT * FROM usuarios',
                            error: 'Timeout de conexión',
                          },
                          stackTrace: 'Error: Timeout...\n    at Connection.query...',
                          metodoHttp: 'POST',
                          ruta: '/api/restaurants',
                          direccionIp: '192.168.1.100',
                          agenteUsuario: 'Mozilla/5.0...',
                          codigoEstadoHttp: 500,
                          codigoError: 'DATABASE_ERROR',
                          fechaCreacion: '2024-01-15T10:30:00.000Z',
                        },
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Log no encontrado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Log no encontrado' },
                      error: { type: 'string', example: 'NOT_FOUND' },
                    },
                  },
                  examples: {
                    error: {
                      summary: 'Log no encontrado',
                      value: {
                        success: false,
                        message: 'Log no encontrado',
                        error: 'NOT_FOUND',
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'No autorizado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'No autorizado' },
                      error: { type: 'string', example: 'UNAUTHORIZED' },
                    },
                  },
                  examples: {
                    error: {
                      summary: 'No autorizado',
                      value: {
                        success: false,
                        message: 'No autorizado',
                        error: 'UNAUTHORIZED',
                        metadata: {
                          timestamp: '2024-01-15T10:30:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/restaurants/public/{slug}': {
        get: {
          tags: ['Restaurants'],
          summary: 'Obtener restaurante por slug (público)',
          description: 'Obtiene un restaurante activo por su slug. Este endpoint es público y no requiere autenticación.',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Slug del restaurante',
            },
          ],
          responses: {
            '200': {
              description: 'Restaurante obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Restaurante obtenido exitosamente' },
                      data: {
                        $ref: '#/components/schemas/Restaurante',
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Restaurante no encontrado',
            },
          },
        },
      },
      '/api/restaurants': {
        get: {
          tags: ['Restaurants'],
          summary: 'Listar restaurantes',
          description: 'Obtiene una lista paginada de restaurantes con filtros opcionales',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1, minimum: 1 },
              description: 'Número de página',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
              description: 'Resultados por página',
            },
            {
              name: 'nombre',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filtrar por nombre (búsqueda parcial)',
            },
            {
              name: 'slug',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filtrar por slug exacto',
            },
            {
              name: 'activo',
              in: 'query',
              schema: { type: 'boolean' },
              description: 'Filtrar por estado activo',
            },
            {
              name: 'estadoSuscripcion',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filtrar por estado de suscripción',
            },
            {
              name: 'ciudad',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filtrar por ciudad',
            },
            {
              name: 'pais',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filtrar por país',
            },
          ],
          responses: {
            '200': {
              description: 'Lista de restaurantes obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Restaurantes obtenidos exitosamente' },
                      data: {
                        type: 'object',
                        properties: {
                          items: {
                            type: 'array',
                            items: {
                              $ref: '#/components/schemas/Restaurante',
                            },
                          },
                          pagination: {
                            $ref: '#/components/schemas/PaginationMetadata',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
          },
        },
        post: {
          tags: ['Restaurants'],
          summary: 'Crear restaurante',
          description: 'Crea un nuevo restaurante en el sistema',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CrearRestauranteDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Crear restaurante básico',
                    value: {
                      nombre: 'Mi Restaurante',
                      slug: 'mi-restaurante',
                      correo: 'contacto@mirestaurante.com',
                      telefono: '+57 300 1234567',
                      biografia: 'Un restaurante acogedor con los mejores sabores',
                      ciudad: 'Montería',
                      pais: 'Colombia',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Restaurante creado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Restaurante creado exitosamente' },
                      data: {
                        $ref: '#/components/schemas/Restaurante',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '409': {
              description: 'Ya existe un restaurante con ese slug o correo',
            },
          },
        },
      },
      '/api/restaurants/{id}': {
        get: {
          tags: ['Restaurants'],
          summary: 'Obtener restaurante por ID',
          description: 'Obtiene los detalles de un restaurante específico por su ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del restaurante',
            },
          ],
          responses: {
            '200': {
              description: 'Restaurante obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Restaurante obtenido exitosamente' },
                      data: {
                        $ref: '#/components/schemas/Restaurante',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Restaurante no encontrado',
            },
          },
        },
        put: {
          tags: ['Restaurants'],
          summary: 'Actualizar restaurante',
          description: 'Actualiza los datos de un restaurante existente',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del restaurante',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ActualizarRestauranteDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Actualizar información básica',
                    value: {
                      nombre: 'Nuevo Nombre del Restaurante',
                      biografia: 'Nueva biografía actualizada',
                      activo: true,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Restaurante actualizado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Restaurante actualizado exitosamente' },
                      data: {
                        $ref: '#/components/schemas/Restaurante',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Restaurante no encontrado',
            },
            '409': {
              description: 'Ya existe otro restaurante con ese slug o correo',
            },
          },
        },
        delete: {
          tags: ['Restaurants'],
          summary: 'Eliminar restaurante',
          description: 'Elimina un restaurante del sistema (soft delete)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del restaurante',
            },
          ],
          responses: {
            '200': {
              description: 'Restaurante eliminado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Restaurante eliminado exitosamente' },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Restaurante no encontrado',
            },
          },
        },
      },
      '/api/roles': {
        get: {
          tags: ['Roles'],
          summary: 'Listar todos los roles',
          description: 'Obtiene una lista de todos los roles con sus permisos asignados',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Lista de roles obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Roles obtenidos exitosamente' },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/RolConPermisos',
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
          },
        },
        post: {
          tags: ['Roles'],
          summary: 'Crear un nuevo rol',
          description: 'Crea un nuevo rol en el sistema',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CrearRolDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Crear rol',
                    value: {
                      nombre: 'Gerente',
                      descripcion: 'Gerente del restaurante',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Rol creado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Rol creado exitosamente' },
                      data: {
                        $ref: '#/components/schemas/RolConPermisos',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '409': {
              description: 'Ya existe un rol con ese nombre',
            },
          },
        },
      },
      '/api/roles/permisos': {
        get: {
          tags: ['Roles'],
          summary: 'Listar permisos disponibles',
          description: 'Obtiene una lista de todos los permisos disponibles en el sistema',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Lista de permisos obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Permisos obtenidos exitosamente' },
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Permiso',
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
          },
        },
      },
      '/api/roles/{id}': {
        get: {
          tags: ['Roles'],
          summary: 'Obtener rol por ID',
          description: 'Obtiene los detalles de un rol específico con sus permisos',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del rol',
            },
          ],
          responses: {
            '200': {
              description: 'Rol obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Rol obtenido exitosamente' },
                      data: {
                        $ref: '#/components/schemas/RolConPermisos',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Rol no encontrado',
            },
          },
        },
        put: {
          tags: ['Roles'],
          summary: 'Actualizar rol',
          description: 'Actualiza los datos de un rol existente',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del rol',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ActualizarRolDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Actualizar descripción',
                    value: {
                      descripcion: 'Nueva descripción del rol',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Rol actualizado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Rol actualizado exitosamente' },
                      data: {
                        $ref: '#/components/schemas/RolConPermisos',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Rol no encontrado',
            },
            '409': {
              description: 'Ya existe otro rol con ese nombre',
            },
          },
        },
        delete: {
          tags: ['Roles'],
          summary: 'Eliminar rol',
          description: 'Elimina un rol del sistema (solo si no está asignado a usuarios)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del rol',
            },
          ],
          responses: {
            '200': {
              description: 'Rol eliminado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Rol eliminado exitosamente' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'No se puede eliminar el rol porque está asignado a usuarios',
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Rol no encontrado',
            },
          },
        },
      },
      '/api/roles/{id}/permisos': {
        post: {
          tags: ['Roles'],
          summary: 'Asignar permisos a un rol',
          description: 'Asigna permisos a un rol (reemplaza los permisos existentes)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'ID del rol',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AsignarPermisosDto',
                },
                examples: {
                  ejemplo1: {
                    summary: 'Asignar permisos',
                    value: {
                      permisoIds: [
                        '123e4567-e89b-12d3-a456-426614174000',
                        '123e4567-e89b-12d3-a456-426614174001',
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Permisos asignados exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Permisos asignados exitosamente' },
                      data: {
                        $ref: '#/components/schemas/RolConPermisos',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/Unauthorized',
            },
            '404': {
              description: 'Rol o permiso no encontrado',
            },
          },
        },
      },
      '/api/enlaces': {
        get: {
          tags: ['Enlaces'],
          summary: 'Listar enlaces',
          description: 'Obtiene una lista paginada de enlaces con filtros opcionales',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
            { name: 'restauranteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'titulo', in: 'query', schema: { type: 'string' } },
            { name: 'tipoIcono', in: 'query', schema: { type: 'string' } },
            { name: 'activo', in: 'query', schema: { type: 'boolean' } },
            { name: 'orden', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: {
            '200': {
              description: 'Lista de enlaces obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Enlaces obtenidos exitosamente' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/EnlaceRestaurante' } },
                      metadata: { $ref: '#/components/schemas/PaginationMetadata' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Enlaces'],
          summary: 'Crear enlace',
          description: 'Crea un nuevo enlace para un restaurante',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CrearEnlaceDto' } } },
          },
          responses: {
            '201': {
              description: 'Enlace creado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Enlace creado exitosamente' },
                      data: { $ref: '#/components/schemas/EnlaceRestaurante' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Restaurante no encontrado' },
          },
        },
      },
      '/api/enlaces/restaurante/{restauranteId}': {
        get: {
          tags: ['Enlaces'],
          summary: 'Obtener enlaces por restaurante',
          description: 'Obtiene todos los enlaces de un restaurante específico',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'restauranteId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Enlaces obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Enlaces obtenidos exitosamente' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/EnlaceRestaurante' } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/enlaces/{id}': {
        get: {
          tags: ['Enlaces'],
          summary: 'Obtener enlace por ID',
          description: 'Obtiene un enlace específico por su ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Enlace obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Enlace obtenido exitosamente' },
                      data: { $ref: '#/components/schemas/EnlaceRestaurante' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Enlace no encontrado' },
          },
        },
        put: {
          tags: ['Enlaces'],
          summary: 'Actualizar enlace',
          description: 'Actualiza un enlace existente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarEnlaceDto' } } },
          },
          responses: {
            '200': {
              description: 'Enlace actualizado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Enlace actualizado exitosamente' },
                      data: { $ref: '#/components/schemas/EnlaceRestaurante' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Enlace no encontrado' },
          },
        },
        delete: {
          tags: ['Enlaces'],
          summary: 'Eliminar enlace',
          description: 'Elimina un enlace del sistema',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Enlace eliminado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Enlace eliminado exitosamente' },
                      data: { type: 'null' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Enlace no encontrado' },
          },
        },
      },
      '/api/enlaces/{id}/clic': {
        post: {
          tags: ['Enlaces'],
          summary: 'Incrementar contador de clics',
          description: 'Incrementa el contador de clics de un enlace',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Contador incrementado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Contador de clics incrementado exitosamente' },
                      data: { type: 'null' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Enlace no encontrado' },
          },
        },
      },
      '/api/categorias': {
        get: {
          tags: ['Categorías'],
          summary: 'Obtener todas las categorías',
          description: 'Obtiene todas las categorías con paginación y filtros',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
            { name: 'restauranteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'nombre', in: 'query', schema: { type: 'string' } },
            { name: 'activa', in: 'query', schema: { type: 'boolean' } },
            { name: 'orden', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: {
            '200': {
              description: 'Categorías obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Categorías obtenidas exitosamente' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Categoria' },
                      },
                      pagination: { $ref: '#/components/schemas/PaginationMetadata' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Categorías'],
          summary: 'Crear categoría',
          description: 'Crea una nueva categoría para un restaurante',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CrearCategoriaDto' } } },
          },
          responses: {
            '201': {
              description: 'Categoría creada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Categoría creada exitosamente' },
                      data: { $ref: '#/components/schemas/Categoria' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Restaurante no encontrado' },
          },
        },
      },
      '/api/categorias/restaurante/{restauranteId}': {
        get: {
          tags: ['Categorías'],
          summary: 'Obtener categorías por restaurante',
          description: 'Obtiene todas las categorías de un restaurante específico',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'restauranteId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Categorías obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Categorías obtenidas exitosamente' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Categoria' } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/categorias/{id}': {
        get: {
          tags: ['Categorías'],
          summary: 'Obtener categoría por ID',
          description: 'Obtiene una categoría específica por su ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Categoría obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Categoría obtenida exitosamente' },
                      data: { $ref: '#/components/schemas/Categoria' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Categoría no encontrada' },
          },
        },
        put: {
          tags: ['Categorías'],
          summary: 'Actualizar categoría',
          description: 'Actualiza una categoría existente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarCategoriaDto' } } },
          },
          responses: {
            '200': {
              description: 'Categoría actualizada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Categoría actualizada exitosamente' },
                      data: { $ref: '#/components/schemas/Categoria' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Categoría no encontrada' },
          },
        },
        delete: {
          tags: ['Categorías'],
          summary: 'Eliminar categoría',
          description: 'Elimina una categoría del sistema (solo si no tiene items del menú asignados)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Categoría eliminada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Categoría eliminada exitosamente' },
                      data: { type: 'null' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Categoría no encontrada' },
            '400': { description: 'No se puede eliminar la categoría porque tiene items del menú asignados' },
          },
        },
      },
      '/api/mesas': {
        get: {
          tags: ['Mesas'],
          summary: 'Obtener todas las mesas',
          description: 'Obtiene todas las mesas con paginación y filtros',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
            { name: 'restauranteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'numero', in: 'query', schema: { type: 'string' } },
            { name: 'seccion', in: 'query', schema: { type: 'string' } },
            { name: 'activa', in: 'query', schema: { type: 'boolean' } },
            { name: 'ocupada', in: 'query', schema: { type: 'boolean' } },
            { name: 'meseroAsignadoId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'orden', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: {
            '200': {
              description: 'Mesas obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mesas obtenidas exitosamente' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/MesaConMesero' },
                      },
                      pagination: { $ref: '#/components/schemas/PaginationMetadata' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Mesas'],
          summary: 'Crear mesa',
          description: 'Crea una nueva mesa para un restaurante',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CrearMesaDto' } } },
          },
          responses: {
            '201': {
              description: 'Mesa creada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mesa creada exitosamente' },
                      data: { $ref: '#/components/schemas/Mesa' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Restaurante o mesero no encontrado' },
            '409': { description: 'Ya existe una mesa con ese número' },
          },
        },
      },
      '/api/mesas/restaurante/{restauranteId}': {
        get: {
          tags: ['Mesas'],
          summary: 'Obtener mesas por restaurante',
          description: 'Obtiene todas las mesas de un restaurante específico',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'restauranteId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Mesas obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mesas obtenidas exitosamente' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/MesaConMesero' } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/mesas/{id}': {
        get: {
          tags: ['Mesas'],
          summary: 'Obtener mesa por ID',
          description: 'Obtiene una mesa específica por su ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Mesa obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mesa obtenida exitosamente' },
                      data: { $ref: '#/components/schemas/MesaConMesero' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Mesa no encontrada' },
          },
        },
        put: {
          tags: ['Mesas'],
          summary: 'Actualizar mesa',
          description: 'Actualiza una mesa existente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarMesaDto' } } },
          },
          responses: {
            '200': {
              description: 'Mesa actualizada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mesa actualizada exitosamente' },
                      data: { $ref: '#/components/schemas/MesaConMesero' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Mesa o mesero no encontrado' },
            '409': { description: 'Ya existe otra mesa con ese número' },
          },
        },
        delete: {
          tags: ['Mesas'],
          summary: 'Eliminar mesa',
          description: 'Elimina una mesa del sistema (solo si no tiene pedidos activos)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Mesa eliminada exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Mesa eliminada exitosamente' },
                      data: { type: 'null' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Mesa no encontrada' },
            '400': { description: 'No se puede eliminar la mesa porque tiene pedidos activos' },
          },
        },
      },
      '/api/usuarios': {
        get: {
          tags: ['Usuarios'],
          summary: 'Obtener todos los usuarios',
          description: 'Obtiene todos los usuarios con paginación y filtros',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
            { name: 'restauranteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'correo', in: 'query', schema: { type: 'string', format: 'email' } },
            { name: 'nombre', in: 'query', schema: { type: 'string' } },
            { name: 'rolId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'activo', in: 'query', schema: { type: 'boolean' } },
            { name: 'correoVerificado', in: 'query', schema: { type: 'boolean' } },
            { name: 'orden', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          ],
          responses: {
            '200': {
              description: 'Usuarios obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuarios obtenidos exitosamente' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/UsuarioConRol' },
                      },
                      pagination: { $ref: '#/components/schemas/PaginationMetadata' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Usuarios'],
          summary: 'Crear usuario',
          description: 'Crea un nuevo usuario en el sistema',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CrearUsuarioDto' } } },
          },
          responses: {
            '201': {
              description: 'Usuario creado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuario creado exitosamente' },
                      data: { $ref: '#/components/schemas/UsuarioConRol' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Restaurante o rol no encontrado' },
            '409': { description: 'Ya existe un usuario con ese correo' },
          },
        },
      },
      '/api/usuarios/restaurante/{restauranteId}': {
        get: {
          tags: ['Usuarios'],
          summary: 'Obtener usuarios por restaurante',
          description: 'Obtiene todos los usuarios de un restaurante específico',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'restauranteId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Usuarios obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuarios obtenidos exitosamente' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/UsuarioConRol' } },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/usuarios/{id}': {
        get: {
          tags: ['Usuarios'],
          summary: 'Obtener usuario por ID',
          description: 'Obtiene un usuario específico por su ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Usuario obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuario obtenido exitosamente' },
                      data: { $ref: '#/components/schemas/UsuarioConRol' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Usuario no encontrado' },
          },
        },
        put: {
          tags: ['Usuarios'],
          summary: 'Actualizar usuario',
          description: 'Actualiza un usuario existente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarUsuarioDto' } } },
          },
          responses: {
            '200': {
              description: 'Usuario actualizado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuario actualizado exitosamente' },
                      data: { $ref: '#/components/schemas/UsuarioConRol' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Usuario, restaurante o rol no encontrado' },
            '409': { description: 'Ya existe otro usuario con ese correo' },
          },
        },
        delete: {
          tags: ['Usuarios'],
          summary: 'Eliminar usuario',
          description: 'Elimina un usuario del sistema (soft delete)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': {
              description: 'Usuario eliminado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Usuario eliminado exitosamente' },
                      data: { type: 'null' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { description: 'Usuario no encontrado' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido del endpoint de login',
        },
      },
      responses: {
        Unauthorized: {
          description: 'No autorizado - Token requerido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'No autorizado' },
                  error: { type: 'string', example: 'UNAUTHORIZED' },
                },
              },
            },
          },
        },
      },
      schemas: {
        Log: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            restauranteId: { type: 'string', format: 'uuid', nullable: true },
            usuarioId: { type: 'string', format: 'uuid', nullable: true },
            nivel: { type: 'string', enum: ['ERROR', 'WARN', 'INFO', 'DEBUG'] },
            categoria: {
              type: 'string',
              enum: ['autenticacion', 'autorizacion', 'api', 'base_datos', 'negocio', 'sistema', 'seguridad'],
            },
            mensaje: { type: 'string' },
            detalle: { type: 'object', nullable: true },
            stackTrace: { type: 'string', nullable: true },
            metodoHttp: { type: 'string', nullable: true },
            ruta: { type: 'string', nullable: true },
            endpoint: { type: 'string', nullable: true },
            direccionIp: { type: 'string', nullable: true },
            agenteUsuario: { type: 'string', nullable: true },
            idSesion: { type: 'string', nullable: true },
            entidadTipo: { type: 'string', nullable: true },
            entidadId: { type: 'string', format: 'uuid', nullable: true },
            tiempoEjecucionMs: { type: 'integer', nullable: true },
            codigoEstadoHttp: { type: 'integer', nullable: true },
            codigoError: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true },
            fechaCreacion: { type: 'string', format: 'date-time' },
          },
        },
        LoginDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@ejemplo.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 6,
              example: 'password123',
            },
          },
        },
        RegisterDto: {
          type: 'object',
          required: ['email', 'password', 'nombre'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'usuario@ejemplo.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 6,
              example: 'password123',
            },
            nombre: {
              type: 'string',
              example: 'Juan Pérez',
            },
            rolId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID del rol (opcional)',
            },
            restauranteId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID del restaurante (opcional)',
            },
          },
        },
        RefreshTokenDto: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            expiresIn: {
              type: 'integer',
              description: 'Tiempo de expiración en segundos',
              example: 86400,
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                nombre: { type: 'string' },
                restauranteId: { type: 'string', format: 'uuid', nullable: true },
                rolId: { type: 'string', format: 'uuid' },
                rolNombre: { type: 'string' },
              },
            },
            tokens: {
              $ref: '#/components/schemas/AuthTokens',
            },
          },
        },
        CrearRolDto: {
          type: 'object',
          required: ['nombre'],
          properties: {
            nombre: {
              type: 'string',
              maxLength: 50,
              example: 'Gerente',
              description: 'Nombre del rol',
            },
            descripcion: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: 'Gerente del restaurante',
              description: 'Descripción del rol',
            },
          },
        },
        ActualizarRolDto: {
          type: 'object',
          properties: {
            nombre: {
              type: 'string',
              maxLength: 50,
              example: 'Gerente',
              description: 'Nombre del rol',
            },
            descripcion: {
              type: 'string',
              maxLength: 255,
              nullable: true,
              example: 'Nueva descripción del rol',
              description: 'Descripción del rol',
            },
          },
        },
        AsignarPermisosDto: {
          type: 'object',
          required: ['permisoIds'],
          properties: {
            permisoIds: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
              },
              minItems: 1,
              example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
              description: 'Array de IDs de permisos a asignar',
            },
          },
        },
        RolConPermisos: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string', example: 'Administrador' },
            descripcion: { type: 'string', nullable: true, example: 'Administrador del restaurante' },
            permisos: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Permiso',
              },
            },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
          },
        },
        Permiso: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            codigo: { type: 'string', example: 'restaurant.*' },
            nombre: { type: 'string', example: 'Gestión completa de restaurante' },
            modulo: { type: 'string', nullable: true, example: 'restaurant' },
          },
        },
        CrearRestauranteDto: {
          type: 'object',
          required: ['nombre', 'slug', 'correo'],
          properties: {
            nombre: {
              type: 'string',
              maxLength: 200,
              example: 'Mi Restaurante',
              description: 'Nombre del restaurante',
            },
            slug: {
              type: 'string',
              maxLength: 100,
              example: 'mi-restaurante',
              description: 'Slug único para URLs (solo letras minúsculas, números y guiones)',
            },
            correo: {
              type: 'string',
              format: 'email',
              maxLength: 255,
              example: 'contacto@mirestaurante.com',
              description: 'Correo electrónico del restaurante',
            },
            telefono: { type: 'string', maxLength: 50, nullable: true, example: '+57 300 1234567' },
            biografia: { type: 'string', maxLength: 1000, nullable: true },
            imagenPerfilUrl: { type: 'string', maxLength: 500, nullable: true },
            imagenPortadaUrl: { type: 'string', maxLength: 500, nullable: true },
            colorTema: { type: 'string', nullable: true, example: '#000000' },
            colorTexto: { type: 'string', nullable: true, example: '#FFFFFF' },
            colorFondo: { type: 'string', nullable: true, example: '#FFFFFF' },
            familiaFuente: { type: 'string', maxLength: 100, nullable: true, example: 'Arial' },
            mostrarMenu: { type: 'boolean', nullable: true, example: true },
            mostrarEnlaces: { type: 'boolean', nullable: true, example: true },
            mostrarContacto: { type: 'boolean', nullable: true, example: true },
            direccion: { type: 'string', maxLength: 500, nullable: true },
            ciudad: { type: 'string', maxLength: 100, nullable: true, example: 'Montería' },
            estadoProvincia: { type: 'string', maxLength: 100, nullable: true },
            pais: { type: 'string', maxLength: 100, nullable: true, example: 'Colombia' },
            codigoPostal: { type: 'string', maxLength: 20, nullable: true },
            latitud: { type: 'number', nullable: true },
            longitud: { type: 'number', nullable: true },
            zonaHoraria: { type: 'string', maxLength: 50, nullable: true, example: 'UTC' },
            moneda: { type: 'string', maxLength: 3, nullable: true, example: 'USD' },
            idioma: { type: 'string', maxLength: 10, nullable: true, example: 'es' },
          },
        },
        ActualizarRestauranteDto: {
          type: 'object',
          properties: {
            nombre: { type: 'string', maxLength: 200, nullable: true },
            slug: { type: 'string', maxLength: 100, nullable: true },
            correo: { type: 'string', format: 'email', maxLength: 255, nullable: true },
            telefono: { type: 'string', maxLength: 50, nullable: true },
            biografia: { type: 'string', maxLength: 1000, nullable: true },
            imagenPerfilUrl: { type: 'string', maxLength: 500, nullable: true },
            imagenPortadaUrl: { type: 'string', maxLength: 500, nullable: true },
            colorTema: { type: 'string', nullable: true },
            colorTexto: { type: 'string', nullable: true },
            colorFondo: { type: 'string', nullable: true },
            familiaFuente: { type: 'string', maxLength: 100, nullable: true },
            mostrarMenu: { type: 'boolean', nullable: true },
            mostrarEnlaces: { type: 'boolean', nullable: true },
            mostrarContacto: { type: 'boolean', nullable: true },
            direccion: { type: 'string', maxLength: 500, nullable: true },
            ciudad: { type: 'string', maxLength: 100, nullable: true },
            estadoProvincia: { type: 'string', maxLength: 100, nullable: true },
            pais: { type: 'string', maxLength: 100, nullable: true },
            codigoPostal: { type: 'string', maxLength: 20, nullable: true },
            latitud: { type: 'number', nullable: true },
            longitud: { type: 'number', nullable: true },
            zonaHoraria: { type: 'string', maxLength: 50, nullable: true },
            moneda: { type: 'string', maxLength: 3, nullable: true },
            idioma: { type: 'string', maxLength: 10, nullable: true },
            activo: { type: 'boolean', nullable: true },
            estadoSuscripcion: { type: 'string', maxLength: 20, nullable: true },
          },
        },
        Restaurante: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            slug: { type: 'string' },
            correo: { type: 'string', format: 'email' },
            telefono: { type: 'string', nullable: true },
            biografia: { type: 'string', nullable: true },
            imagenPerfilUrl: { type: 'string', nullable: true },
            imagenPortadaUrl: { type: 'string', nullable: true },
            colorTema: { type: 'string' },
            colorTexto: { type: 'string' },
            colorFondo: { type: 'string' },
            familiaFuente: { type: 'string' },
            mostrarMenu: { type: 'boolean' },
            mostrarEnlaces: { type: 'boolean' },
            mostrarContacto: { type: 'boolean' },
            direccion: { type: 'string', nullable: true },
            ciudad: { type: 'string', nullable: true },
            estadoProvincia: { type: 'string', nullable: true },
            pais: { type: 'string', nullable: true },
            codigoPostal: { type: 'string', nullable: true },
            latitud: { type: 'number', nullable: true },
            longitud: { type: 'number', nullable: true },
            zonaHoraria: { type: 'string' },
            moneda: { type: 'string' },
            idioma: { type: 'string' },
            activo: { type: 'boolean' },
            estadoSuscripcion: { type: 'string' },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
            fechaEliminacion: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        PaginationMetadata: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
        CrearEnlaceDto: {
          type: 'object',
          required: ['restauranteId', 'titulo', 'url'],
          properties: {
            restauranteId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            titulo: { type: 'string', maxLength: 200, example: 'Síguenos en Facebook' },
            url: { type: 'string', format: 'uri', maxLength: 500, example: 'https://facebook.com/mirestaurante' },
            iconoUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            tipoIcono: { type: 'string', maxLength: 50, nullable: true, example: 'facebook' },
            ordenVisualizacion: { type: 'integer', minimum: 0, nullable: true, example: 1 },
            activo: { type: 'boolean', nullable: true, example: true },
          },
        },
        ActualizarEnlaceDto: {
          type: 'object',
          properties: {
            titulo: { type: 'string', maxLength: 200, nullable: true },
            url: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            iconoUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            tipoIcono: { type: 'string', maxLength: 50, nullable: true },
            ordenVisualizacion: { type: 'integer', minimum: 0, nullable: true },
            activo: { type: 'boolean', nullable: true },
          },
        },
        EnlaceRestaurante: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            restauranteId: { type: 'string', format: 'uuid' },
            titulo: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            iconoUrl: { type: 'string', format: 'uri', nullable: true },
            tipoIcono: { type: 'string', nullable: true },
            ordenVisualizacion: { type: 'integer' },
            activo: { type: 'boolean' },
            contadorClics: { type: 'integer' },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
          },
        },
        CrearCategoriaDto: {
          type: 'object',
          required: ['restauranteId', 'nombre'],
          properties: {
            restauranteId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            nombre: { type: 'string', maxLength: 200, example: 'Entradas' },
            descripcion: { type: 'string', maxLength: 500, nullable: true, example: 'Platos para comenzar' },
            imagenUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            ordenVisualizacion: { type: 'integer', minimum: 0, nullable: true, example: 1 },
            activa: { type: 'boolean', nullable: true, example: true },
          },
        },
        ActualizarCategoriaDto: {
          type: 'object',
          properties: {
            nombre: { type: 'string', maxLength: 200, nullable: true },
            descripcion: { type: 'string', maxLength: 500, nullable: true },
            imagenUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            ordenVisualizacion: { type: 'integer', minimum: 0, nullable: true },
            activa: { type: 'boolean', nullable: true },
          },
        },
        Categoria: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            restauranteId: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            descripcion: { type: 'string', nullable: true },
            imagenUrl: { type: 'string', format: 'uri', nullable: true },
            ordenVisualizacion: { type: 'integer' },
            activa: { type: 'boolean' },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
          },
        },
        CrearMesaDto: {
          type: 'object',
          required: ['restauranteId', 'numero'],
          properties: {
            restauranteId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            numero: { type: 'string', maxLength: 20, example: 'Mesa 1' },
            nombre: { type: 'string', maxLength: 100, nullable: true, example: 'Mesa VIP' },
            codigoQr: { type: 'string', maxLength: 500, nullable: true },
            imagenQrUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            capacidad: { type: 'integer', minimum: 1, nullable: true, example: 4 },
            seccion: { type: 'string', maxLength: 100, nullable: true, example: 'Interior' },
            piso: { type: 'integer', minimum: 1, nullable: true, example: 1 },
            meseroAsignadoId: { type: 'string', format: 'uuid', nullable: true },
            activa: { type: 'boolean', nullable: true, example: true },
            ocupada: { type: 'boolean', nullable: true, example: false },
          },
        },
        ActualizarMesaDto: {
          type: 'object',
          properties: {
            numero: { type: 'string', maxLength: 20, nullable: true },
            nombre: { type: 'string', maxLength: 100, nullable: true },
            codigoQr: { type: 'string', maxLength: 500, nullable: true },
            imagenQrUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            capacidad: { type: 'integer', minimum: 1, nullable: true },
            seccion: { type: 'string', maxLength: 100, nullable: true },
            piso: { type: 'integer', minimum: 1, nullable: true },
            meseroAsignadoId: { type: 'string', format: 'uuid', nullable: true },
            activa: { type: 'boolean', nullable: true },
            ocupada: { type: 'boolean', nullable: true },
          },
        },
        Mesa: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            restauranteId: { type: 'string', format: 'uuid' },
            numero: { type: 'string' },
            nombre: { type: 'string', nullable: true },
            codigoQr: { type: 'string', nullable: true },
            imagenQrUrl: { type: 'string', format: 'uri', nullable: true },
            capacidad: { type: 'integer' },
            activa: { type: 'boolean' },
            ocupada: { type: 'boolean' },
            seccion: { type: 'string', nullable: true },
            piso: { type: 'integer' },
            meseroAsignadoId: { type: 'string', format: 'uuid', nullable: true },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
          },
        },
        MesaConMesero: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            restauranteId: { type: 'string', format: 'uuid' },
            numero: { type: 'string' },
            nombre: { type: 'string', nullable: true },
            codigoQr: { type: 'string', nullable: true },
            imagenQrUrl: { type: 'string', format: 'uri', nullable: true },
            capacidad: { type: 'integer' },
            activa: { type: 'boolean' },
            ocupada: { type: 'boolean' },
            seccion: { type: 'string', nullable: true },
            piso: { type: 'integer' },
            meseroAsignadoId: { type: 'string', format: 'uuid', nullable: true },
            meseroNombre: { type: 'string', nullable: true },
            meseroEmail: { type: 'string', format: 'email', nullable: true },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
          },
        },
        CrearUsuarioDto: {
          type: 'object',
          required: ['correo', 'password'],
          properties: {
            correo: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
            password: { type: 'string', format: 'password', minLength: 6, example: 'password123' },
            nombre: { type: 'string', maxLength: 100, nullable: true, example: 'Juan' },
            apellido: { type: 'string', maxLength: 100, nullable: true, example: 'Pérez' },
            telefono: { type: 'string', maxLength: 50, nullable: true, example: '+57 300 1234567' },
            avatarUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            restauranteId: { type: 'string', format: 'uuid', nullable: true },
            rolId: { type: 'string', format: 'uuid', nullable: true },
            activo: { type: 'boolean', nullable: true, example: true },
            correoVerificado: { type: 'boolean', nullable: true, example: false },
          },
        },
        ActualizarUsuarioDto: {
          type: 'object',
          properties: {
            correo: { type: 'string', format: 'email', nullable: true },
            password: { type: 'string', format: 'password', nullable: true },
            nombre: { type: 'string', maxLength: 100, nullable: true },
            apellido: { type: 'string', maxLength: 100, nullable: true },
            telefono: { type: 'string', maxLength: 50, nullable: true },
            avatarUrl: { type: 'string', format: 'uri', maxLength: 500, nullable: true },
            restauranteId: { type: 'string', format: 'uuid', nullable: true },
            rolId: { type: 'string', format: 'uuid', nullable: true },
            activo: { type: 'boolean', nullable: true },
            correoVerificado: { type: 'boolean', nullable: true },
          },
        },
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            correo: { type: 'string', format: 'email' },
            nombre: { type: 'string', nullable: true },
            apellido: { type: 'string', nullable: true },
            telefono: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            restauranteId: { type: 'string', format: 'uuid', nullable: true },
            correoVerificado: { type: 'boolean' },
            activo: { type: 'boolean' },
            ultimoAcceso: { type: 'string', format: 'date-time', nullable: true },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
            fechaEliminacion: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        UsuarioConRol: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            correo: { type: 'string', format: 'email' },
            nombre: { type: 'string', nullable: true },
            apellido: { type: 'string', nullable: true },
            telefono: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            restauranteId: { type: 'string', format: 'uuid', nullable: true },
            correoVerificado: { type: 'boolean' },
            activo: { type: 'boolean' },
            ultimoAcceso: { type: 'string', format: 'date-time', nullable: true },
            fechaCreacion: { type: 'string', format: 'date-time' },
            fechaActualizacion: { type: 'string', format: 'date-time' },
            fechaEliminacion: { type: 'string', format: 'date-time', nullable: true },
            rolId: { type: 'string', format: 'uuid', nullable: true },
            rolNombre: { type: 'string', nullable: true },
            restauranteNombre: { type: 'string', nullable: true },
          },
        },
      },
    },
  };
  res.json(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/enlaces', enlacesRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/items-menu', itemsMenuRoutes);
app.use('/api/adiciones', adicionesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/configuracion-reservas', configuracionReservasRoutes);
// Nota: webhooks se registra ANTES de express.json() (ver arriba)

// 404 Handler y Error Handler se registrarán después de Scalar (dentro de startServer)
// para que Scalar pueda estar en la ruta raíz sin interferir con las rutas de API

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar Firebase Admin SDK
    try {
      initializeFirebase();
      console.log('✅ Firebase inicializado correctamente');
    } catch (firebaseError: any) {
      console.warn('⚠️ Advertencia: No se pudo inicializar Firebase:', firebaseError.message);
      console.warn('   El servicio de storage puede no funcionar correctamente');
    }

    // Inicializar servicio de email
    try {
      const emailTransport = initEmailTransport();
      if (emailTransport) {
        console.log('✅ Servicio de email inicializado correctamente');
      } else {
        console.warn('⚠️ Advertencia: Servicio de email no configurado. Los emails no se enviarán.');
      }
    } catch (emailError: any) {
      console.warn('⚠️ Advertencia: No se pudo inicializar el servicio de email:', emailError.message);
      console.warn('   Los emails de notificación no se enviarán');
    }

    // Verificar y conectar a la base de datos
    const { testConnection } = await import('./config/testConnection');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ No se pudo conectar a la base de datos. El servidor no se iniciará.');
      process.exit(1);
    }

    // Inicializar Scalar API Documentation (import dinámico porque es ESM)
    // Se registra después de todas las rutas para que las rutas de API tengan prioridad
    try {
      // Construir URL para el spec de OpenAPI
      // API_URL debe ser algo como: https://apimenusqr.site/api
      let baseUrl = process.env.API_URL || `http://localhost:${PORT}/api`;
      
      // Asegurarse de que baseUrl no termine con /api (para construir la URL completa)
      baseUrl = baseUrl.replace(/\/api\/?$/, '');
      
      // Construir la URL completa del spec
      const scalarUrl = `${baseUrl}/api/docs.json`;
      
      console.log(`📄 URL de Scalar OpenAPI spec: ${scalarUrl}`);
      console.log(`📄 API_URL desde env: ${process.env.API_URL}`);
      
      // Cargar Scalar usando import dinámico
      // NOTA: TypeScript transformará esto a require() en CommonJS, pero Node.js 18+ 
      // soporta imports dinámicos de ESM nativamente en tiempo de ejecución
      const scalarModuleName = '@scalar/express-api-reference';
      // Usar Function para evitar transformación estática de TypeScript
      const dynamicImport = new Function('m', 'return import(m)');
      const scalarModule = await dynamicImport(scalarModuleName);
      const { apiReference } = scalarModule;
      
      // Scalar en la ruta raíz (/) - se registra después de todas las rutas de API
      // para que las rutas /api/* y /health tengan prioridad
      // Deshabilitar Helmet CSP para la ruta de Scalar ya que necesita estilos inline
      app.use(
        '/',
        (req, res, next) => {
          // CSP permisivo para Scalar - permite estilos inline necesarios
          res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://cdn.skypack.dev; " +
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com; " +
            "img-src 'self' data: blob: https:; " +
            "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; " +
            "connect-src 'self' " + baseUrl + " http://localhost:* https://api.scalar.com https://cdn.jsdelivr.net https://unpkg.com; " +
            "frame-src 'self';"
          );
          next();
        },
        apiReference({
          theme: 'purple',
          url: scalarUrl,
        })
      );
      
      // Redirección de /api/docs a / para compatibilidad
      app.get('/api/docs', (req, res) => {
        res.redirect('/');
      });
      
      console.log('✅ Scalar API Documentation inicializado en la ruta raíz (/)');
    } catch (scalarError: any) {
      console.warn('⚠️ Advertencia: No se pudo inicializar Scalar:', scalarError.message);
      console.warn('   La documentación de API no estará disponible');
    }

    // 404 Handler (después de Scalar)
    // Solo se ejecutará si ninguna ruta previa (incluyendo Scalar) manejó la solicitud
    app.use((req, res) => {
      res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.path 
      });
    });

    // Error Handler (debe ser el último middleware)
    app.use(errorHandler);

    // Crear servidor HTTP
    const httpServer = http.createServer(app);

    // Inicializar Socket.io
    initializeSocketIO(httpServer);

    // Iniciar servidor HTTP
    httpServer.listen(PORT, () => {
      console.log('\n🚀 Servidor iniciado correctamente');
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   📚 Docs: http://localhost:${PORT}/ (Scalar API Documentation)`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales para cerrar correctamente
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM recibido, cerrando servidor...');
  const { closeConnection } = await import('./config/testConnection');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT recibido, cerrando servidor...');
  const { closeConnection } = await import('./config/testConnection');
  await closeConnection();
  process.exit(0);
});

startServer();

