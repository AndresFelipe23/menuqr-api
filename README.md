# Backend - Sistema de Menú QR

Backend API desarrollado con Node.js, TypeScript, Express y TypeORM para SQL Server.

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **TypeScript** - Superset tipado de JavaScript
- **Express** - Framework web para Node.js
- **TypeORM** - ORM para TypeScript/JavaScript
- **SQL Server** - Base de datos relacional
- **JWT** - Autenticación mediante tokens
- **Socket.io** - Comunicación en tiempo real
- **bcrypt** - Hash de contraseñas

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuraciones (BD, env)
│   ├── controllers/     # Controladores (lógica de endpoints)
│   ├── dto/            # Data Transfer Objects (validación)
│   ├── entities/       # Entidades TypeORM (modelos de BD)
│   ├── middlewares/    # Middlewares personalizados
│   ├── routes/         # Definición de rutas
│   ├── services/       # Lógica de negocio
│   ├── utils/          # Utilidades (logger, helpers)
│   └── server.ts       # Punto de entrada
├── dist/               # Código compilado (generado)
├── package.json
├── tsconfig.json
└── .env                # Variables de entorno (no versionado)
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+ o Bun
- SQL Server instalado y corriendo
- Base de datos `MenuQR` creada con el esquema

### Pasos

1. **Instalar dependencias:**
```bash
cd backend
bun install
# o
npm install
```

2. **Configurar variables de entorno:**
```bash
cp env.example .env
```

Editar `.env` con tus credenciales:
```env
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=tu_password
DB_DATABASE=MenuQR
JWT_SECRET=tu_secret_super_seguro
```

3. **Ejecutar en desarrollo:**
```bash
bun run dev
# o
npm run dev
```

4. **Compilar para producción:**
```bash
bun run build
# o
npm run build
```

5. **Ejecutar en producción:**
```bash
bun start
# o
npm start
```

## 🔌 Endpoints

### Health Check
- `GET /health` - Estado del servidor

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/refresh` - Renovar token

### Restaurantes
- `GET /api/restaurants` - Listar restaurantes
- `GET /api/restaurants/:id` - Obtener restaurante

## 📝 Convenciones de Código

### Estructura de Archivos
- **DTOs**: Primero se crean los DTOs para validación
- **Servicios**: Luego los servicios con la lógica de negocio
- **Controladores**: Finalmente los controladores que usan servicios y DTOs

### Nombres
- Entidades: PascalCase (ej: `Restaurante`)
- DTOs: PascalCase con sufijo Dto (ej: `CrearRestauranteDto`)
- Servicios: PascalCase con sufijo Service (ej: `RestauranteService`)
- Controladores: PascalCase con sufijo Controller (ej: `RestauranteController`)

## 🔐 Seguridad

- Helmet para headers de seguridad
- CORS configurado
- Rate limiting implementado
- Validación de datos con class-validator y Zod
- Passwords hasheados con bcrypt
- JWT para autenticación

## 📊 Base de Datos

La conexión a SQL Server se configura en `src/config/database.ts`.

### Migraciones

```bash
# Generar migración
bun run migration:generate -- -n NombreMigracion

# Ejecutar migraciones
bun run migration:run

# Revertir última migración
bun run migration:revert
```

## 🧪 Testing

Por implementar:
- Jest para unit tests
- Supertest para integration tests

## 📚 Documentación API

Por implementar:
- Swagger/OpenAPI
- Postman Collection

## 🚢 Deployment

1. Compilar el proyecto
2. Configurar variables de entorno en producción
3. Ejecutar migraciones
4. Iniciar servidor con PM2 o similar

