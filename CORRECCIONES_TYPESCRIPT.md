# 🔧 Correcciones de Errores TypeScript

Este documento lista todos los errores y sus correcciones necesarias.

## ✅ Errores Ya Corregidos

1. ✅ `typeorm.config.ts` - `connectionTimeout` → `connectTimeout`
2. ✅ `routes/adiciones.routes.ts` - `validateDto` con strings → usar `validateQuery` o `validateDto` correctamente
3. ✅ `routes/items-menu.routes.ts` - Mismo problema de validateDto
4. ✅ `routes/pedidos.routes.ts` - Mismo problema de validateDto

## 🔄 Errores Pendientes por Categoría

### 1. Errores de LogData (Propiedades que no existen)

**Problema**: Propiedades como `error`, `socketId`, `pedidoId`, `suscripcionId`, etc. no existen en `LogData`. Deben ir en `detalle` o `metadata`.

**Solución**: Mover estas propiedades a `detalle` o `metadata`.

**Archivos afectados:**
- `src/config/socket.config.ts` (líneas 98, 111, 130, 141, 160, 168)
- `src/middlewares/auth.middleware.ts` (líneas 75, 97)
- `src/routes/webhooks.routes.ts` (múltiples líneas)
- `src/services/auth.service.ts` (línea 322)
- `src/services/items-menu.service.ts` (línea 376)
- `src/services/mesas.service.ts` (línea 312)
- `src/services/suscripciones.service.ts` (múltiples líneas)
- `src/services/websocket.service.ts` (múltiples líneas)
- `src/services/wompi.service.ts` (línea 225)

**Ejemplo de corrección:**

**Antes:**
```typescript
Logger.error('Error', error, {
  categoria: LogCategory.SISTEMA,
  error: error.message,  // ❌ No existe
  socketId: socket.id,   // ❌ No existe
});
```

**Después:**
```typescript
Logger.error('Error', error, {
  categoria: LogCategory.SISTEMA,
  detalle: {             // ✅ Usar detalle
    error: error.message,
    socketId: socket.id,
  },
});
```

### 2. Errores de Logger.warn (Demasiados argumentos)

**Problema**: `Logger.warn()` solo acepta 2 parámetros (message, data), pero algunos lugares pasan 3.

**Archivos afectados:**
- `src/services/suscripciones.service.ts` (líneas 381, 395)

**Ejemplo de corrección:**

**Antes:**
```typescript
Logger.warn('Mensaje', error, {  // ❌ 3 parámetros
  categoria: LogCategory.NEGOCIO,
});
```

**Después:**
```typescript
Logger.warn('Mensaje', {  // ✅ 2 parámetros
  categoria: LogCategory.NEGOCIO,
  detalle: { error: error.message },
});
```

### 3. Errores de Tipos de Stripe

**Problema**: `subscription.current_period_start` no existe directamente en `Response<Subscription>`.

**Archivo afectado:**
- `src/services/suscripciones.service.ts` (líneas 254-256)

**Solución**: Acceder a las propiedades correctamente desde el objeto Subscription.

### 4. Errores de Tipos null/undefined

**Archivos afectados:**
- `src/services/auth.service.ts` (línea 314)
- `src/services/usuarios.service.ts` (líneas 334, 509, 598)

**Solución**: Manejar valores null/undefined apropiadamente.

### 5. Errores de Tipos en Wompi

**Problema**: `error` es de tipo `unknown` en catch blocks.

**Archivo afectado:**
- `src/services/wompi.service.ts` (líneas 91, 94, 146, 149, 179, 182)

**Solución**: Verificar y hacer type casting apropiado.

### 6. Otros Errores

- `src/services/suscripciones.service.ts` - `estado = 'incomplete'` no es válido
- `src/services/roles.service.ts` - Parámetros implícitos `any`

