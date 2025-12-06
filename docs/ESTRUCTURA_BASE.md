# Estructura Base del Backend

Este documento describe la estructura base del proyecto que incluye tipos, utilidades, clases base y middlewares comunes.

## 📁 Estructura de Archivos

```
backend/src/
├── types/                  # Tipos e interfaces TypeScript
│   ├── common.types.ts    # Tipos comunes (ApiResponse, Pagination, etc.)
│   ├── express.types.ts   # Extensiones de tipos para Express
│   └── index.ts           # Exportaciones centralizadas
│
├── utils/                  # Utilidades
│   ├── logger.ts          # Sistema de logging
│   ├── response.util.ts   # Utilidades para respuestas estandarizadas
│   ├── pagination.util.ts # Utilidades para paginación
│   ├── helpers.ts         # Funciones helper generales
│   └── index.ts           # Exportaciones centralizadas
│
├── services/               # Lógica de negocio
│   └── base.service.ts    # Clase base para servicios
│
├── controllers/            # Controladores (endpoints)
│   └── base.controller.ts # Clase base para controladores
│
├── middlewares/            # Middlewares Express
│   ├── errorHandler.ts    # Manejo centralizado de errores
│   ├── validation.middleware.ts # Validación de DTOs
│   ├── requestLogger.ts   # Logger de requests
│   └── index.ts           # Exportaciones centralizadas
│
└── ...
```

## 🎯 Componentes Principales

### 1. Tipos Comunes (`types/`)

#### `common.types.ts`
Define tipos compartidos en toda la aplicación:
- `ApiResponse<T>`: Respuesta estandarizada de la API
- `PaginationParams`: Parámetros de paginación
- `PaginatedResponse<T>`: Respuesta paginada
- `RequestUser`: Información del usuario autenticado
- `JwtPayload`: Payload del token JWT

#### `express.types.ts`
Extensiones de tipos para Express:
- `AuthenticatedRequest`: Request con usuario autenticado
- `RequestWithRestaurant`: Request con restaurante asociado

### 2. Utilidades (`utils/`)

#### `logger.ts`
Sistema de logging que guarda en:
- **Consola**: En desarrollo
- **Base de datos**: Tabla `logs_sistema`

Uso:
```typescript
import { Logger, LogCategory } from '../utils/logger';

Logger.info('Operación exitosa', {
  categoria: LogCategory.API,
  usuarioId: '123',
});
```

#### `response.util.ts`
Utilidades para respuestas estandarizadas:

```typescript
import { ResponseUtil } from '../utils/response.util';

// Respuesta exitosa
ResponseUtil.success(res, data, 'Operación exitosa');

// Respuesta paginada
ResponseUtil.paginated(res, paginatedData);

// Respuesta de error
ResponseUtil.error(res, 'Mensaje de error', 400, 'ERROR_CODE');
```

#### `pagination.util.ts`
Utilidades para paginación:

```typescript
import { PaginationUtil } from '../utils/pagination.util';

const pagination = PaginationUtil.calculatePagination(total, page, limit);
const paginatedResponse = PaginationUtil.createPaginatedResponse(items, total, page, limit);
```

#### `helpers.ts`
Funciones helper generales:
- `generateId()`: Genera ID único
- `isValidUUID()`: Valida UUID
- `getClientIp()`: Obtiene IP del cliente
- `pickFields()` / `omitFields()`: Selecciona/omite campos de objetos

### 3. Clases Base

#### `BaseService` (`services/base.service.ts`)
Clase base para todos los servicios:

```typescript
import { BaseService } from '../services/base.service';
import { LogCategory } from '../utils/logger';

export class MiService extends BaseService {
  protected logCategory = LogCategory.NEGOCIO;

  async operacion() {
    this.logOperation('operación');
    // ... lógica
    this.logSuccess('operación', data);
  }
}
```

Métodos disponibles:
- `handleError()`: Maneja errores y los convierte a AppError
- `logSuccess()`: Log de operación exitosa
- `logOperation()`: Log de operación iniciada
- `requireExists()`: Valida que un valor exista
- `require()`: Valida una condición

#### `BaseController` (`controllers/base.controller.ts`)
Clase base para todos los controladores:

```typescript
import { BaseController } from '../controllers/base.controller';

export class MiController extends BaseController {
  public metodo = this.asyncHandler(async (req, res) => {
    const userId = this.getAuthenticatedUser(req).id;
    const restauranteId = this.getRestaurantId(req);
    const { page, limit } = this.getPaginationParams(req);
    
    // ... lógica
    
    return this.responseUtil.success(res, data);
  });
}
```

Métodos disponibles:
- `asyncHandler()`: Wrapper para manejar errores async
- `getAuthenticatedUser()`: Obtiene usuario autenticado
- `getRestaurantId()`: Obtiene ID del restaurante
- `getPaginationParams()`: Obtiene parámetros de paginación
- `requireId()`: Valida parámetro ID de ruta
- `getBody<T>()`: Obtiene body tipado

### 4. Middlewares

#### `errorHandler.ts`
Manejo centralizado de errores. Maneja:
- Errores de TypeORM
- Errores JWT
- Errores de validación
- Errores de base de datos (duplicados, foreign keys)
- Errores operacionales vs errores del sistema

#### `validation.middleware.ts`
Validación de DTOs usando class-validator:

```typescript
import { validateDto } from '../middlewares/validation.middleware';

router.post('/ruta', validateDto(CrearDto), controller.metodo);
```

Disponible también:
- `validateQuery()`: Valida query parameters
- `validateParams()`: Valida route parameters

#### `requestLogger.ts`
Logger de requests HTTP (ya implementado).

## 🔄 Flujo de Trabajo Recomendado

### Crear un Nuevo Endpoint

1. **Crear DTO** (`dto/`):
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CrearRecursoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
```

2. **Crear Servicio** (`services/`):
```typescript
import { BaseService } from '../services/base.service';

export class RecursoService extends BaseService {
  async crear(data: CrearRecursoDto) {
    this.logOperation('crear recurso');
    // ... lógica
    this.logSuccess('crear recurso', resultado);
    return resultado;
  }
}
```

3. **Crear Controlador** (`controllers/`):
```typescript
import { BaseController } from '../controllers/base.controller';
import { RecursoService } from '../services/recurso.service';

export class RecursoController extends BaseController {
  private service = new RecursoService();

  public crear = this.asyncHandler(async (req, res) => {
    const data = this.getBody<CrearRecursoDto>(req);
    const resultado = await this.service.crear(data);
    return this.responseUtil.success(res, resultado, 'Recurso creado', 201);
  });
}
```

4. **Crear Rutas** (`routes/`):
```typescript
import { Router } from 'express';
import { validateDto } from '../middlewares';
import { CrearRecursoDto } from '../dto';
import { RecursoController } from '../controllers';

const router = Router();
const controller = new RecursoController();

router.post('/', validateDto(CrearRecursoDto), controller.crear);

export default router;
```

5. **Registrar en `server.ts`**:
```typescript
import recursoRoutes from './routes/recurso.routes';

app.use('/api/recursos', recursoRoutes);
```

## 📝 Convenciones

### Nombres de Archivos
- **DTOs**: `crear-recurso.dto.ts` o `CrearRecursoDto.ts`
- **Servicios**: `recurso.service.ts`
- **Controladores**: `recurso.controller.ts`
- **Rutas**: `recurso.routes.ts`

### Respuestas de API
Todas las respuestas siguen el formato:
```json
{
  "success": true,
  "message": "Mensaje opcional",
  "data": { ... },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "page": 1,
    "limit": 10,
    ...
  }
}
```

### Manejo de Errores
- Usa `AppError` para errores operacionales
- Usa `ResponseUtil.error()` en controladores
- El `errorHandler` middleware captura todos los errores

## 🔐 Logging

Todos los logs se guardan en la tabla `logs_sistema` con:
- Nivel (ERROR, WARN, INFO, DEBUG)
- Categoría (API, BASE_DATOS, NEGOCIO, etc.)
- Mensaje y detalles
- Información del request (IP, método, ruta)
- Información del usuario (si está autenticado)

## 📚 Próximos Pasos

- [ ] Implementar middleware de autenticación JWT
- [ ] Implementar middleware de autorización (roles)
- [ ] Crear entidades TypeORM
- [ ] Implementar servicios específicos del dominio
- [ ] Implementar controladores específicos

