# Guía de Instalación - Backend

## 📋 Prerrequisitos

1. **Node.js 18+** o **Bun** instalado
2. **SQL Server** corriendo con la base de datos `MenuQR` creada

## 🚀 Instalación

### Paso 1: Instalar Dependencias

Abre una terminal en la carpeta `backend/` y ejecuta:

```bash
# Si usas Bun (recomendado)
bun install

# O si usas npm
npm install

# O si usas yarn
yarn install
```

### Paso 2: Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
```bash
cp env.example .env
```

2. Edita el archivo `.env` con tus credenciales:
```env
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=tu_password_aqui
DB_DATABASE=MenuQR
```

### Paso 3: Verificar Conexión a Base de Datos

Prueba la conexión antes de iniciar el servidor:

```bash
# Con Bun
bun run test:db

# Con npm
npm run test:db
```

Si todo está correcto, deberías ver:
```
✅ Conexión exitosa a la base de datos
```

### Paso 4: Iniciar el Servidor

```bash
# Modo desarrollo (con hot-reload)
bun run dev
# o
npm run dev

# Modo producción
bun run build
bun start
# o
npm run build
npm start
```

## ❌ Problemas Comunes

### Error: "bun: command not found: tsx"

**Solución**: Las dependencias no están instaladas. Ejecuta:
```bash
bun install
```

### Error: "Cannot find module"

**Solución**: 
1. Verifica que estés en la carpeta `backend/`
2. Reinstala las dependencias:
```bash
rm -rf node_modules
bun install
```

### Error de conexión a base de datos

Ver la guía completa en `CONFIGURACION_DB.md`

## ✅ Verificación

Si todo está bien, deberías ver al iniciar el servidor:

```
🔌 Intentando conectar a la base de datos...
✅ Conexión exitosa a la base de datos
🚀 Servidor iniciado correctamente
   URL: http://localhost:5290
   API: http://localhost:5290/api
```

