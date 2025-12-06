# 🔧 Guía Completa de Correcciones TypeScript

Este documento contiene todas las correcciones necesarias para resolver los 61 errores de TypeScript.

## ✅ Errores ya corregidos

1. ✅ `typeorm.config.ts:19` - `connectionTimeout` → `connectTimeout`
2. ✅ `routes/adiciones.routes.ts` - Correcciones de `validateDto`
3. ✅ `routes/items-menu.routes.ts` - Correcciones de `validateDto`
4. ✅ `routes/pedidos.routes.ts` - Correcciones de `validateDto`
5. ✅ `config/socket.config.ts` - Correcciones de LogData

## 🔄 Correcciones pendientes

### Grupo 1: Errores de LogData (Mover propiedades a `detalle`)

#### 1. auth.middleware.ts

**Línea 75:**
```typescript
// Antes:
error: error.message,

// Después:
detalle: { error: error.message },
```

**Línea 97:**
```typescript
// Antes:
Logger.error('Error inesperado en autenticación', {
  categoria: LogCategory.AUTHENTICACION,
  // ...
  error: error instanceof Error ? error.message : String(error),
});

// Después:
Logger.error('Error inesperado en autenticación', error instanceof Error ? error : new Error(String(error)), {
  categoria: LogCategory.AUTHENTICACION,
  // ... (sin error aquí)
});
```

---

#### 2. routes/webhooks.routes.ts

Mover estas propiedades a `detalle`:
- `eventType` (línea 69) → `detalle: { eventType: ... }`
- `stripeCustomerId` (línea 94) → `detalle: { stripeCustomerId: ... }`
- `suscripcionId` (múltiples) → `detalle: { suscripcionId: ... }`
- `transactionId` (línea 331) → `detalle: { transactionId: ... }`

---

#### 3. services/*.service.ts

Mover a `detalle`:
- `error` → `detalle: { error: ... }`
- `suscripcionId` → `detalle: { suscripcionId: ... }`
- `pedidoId` → `detalle: { pedidoId: ... }`
- `mesaId` → `detalle: { mesaId: ... }`
- `transactionId` → `detalle: { transactionId: ... }`
- `tipo` → `detalle: { tipo: ... }`

---

### Grupo 2: Errores de Stripe Subscription

#### suscripciones.service.ts

**Problema**: `subscription.current_period_start` no existe directamente en el tipo.

**Solución**: El objeto Subscription de Stripe sí tiene estas propiedades, pero TypeScript no las reconoce. Necesitamos hacer un type assertion o acceder correctamente.

**Línea 254-256:**
```typescript
// Antes:
if (subscription.current_period_start && subscription.current_period_end) {
  const inicioPeriodoDate = new Date(subscription.current_period_start * 1000);
  const finPeriodoDate = new Date(subscription.current_period_end * 1000);

// Después:
const subscriptionData = subscription as Stripe.Subscription;
if (subscriptionData.current_period_start && subscriptionData.current_period_end) {
  const inicioPeriodoDate = new Date(subscriptionData.current_period_start * 1000);
  const finPeriodoDate = new Date(subscriptionData.current_period_end * 1000);
```

---

### Grupo 3: Error de tipo de estado

#### suscripciones.service.ts

**Línea 100:**
```typescript
// Antes:
let estado: 'active' | 'trialing' = 'active';

// Después:
let estado: 'active' | 'trialing' | 'incomplete' = 'active';
```

O mejor, usar el tipo completo:
```typescript
let estado: Suscripcion['estado'] = 'active';
```

---

### Grupo 4: Logger.warn con 3 parámetros

#### suscripciones.service.ts

**Línea 381 y 395:**

**Antes:**
```typescript
Logger.warn('Mensaje', error, {
  categoria: this.logCategory,
});
```

**Después:**
```typescript
Logger.warn('Mensaje', {
  categoria: this.logCategory,
  detalle: { error: error instanceof Error ? error.message : String(error) },
});
```

---

### Grupo 5: Tipos null/undefined

#### auth.service.ts - Línea 314

**Problema**: `restauranteId` puede ser `undefined`.

**Solución**: Agregar validación o usar `!` si está garantizado.

#### usuarios.service.ts - Líneas 334, 509, 598

**Problema**: `restauranteId` puede ser `null` pero el tipo espera `string | undefined`.

**Solución**: Convertir `null` a `undefined`:
```typescript
restauranteId: crearUsuarioDto.restauranteId ?? undefined,
```

---

### Grupo 6: Wompi Service - Tipos unknown

#### wompi.service.ts

**Problema**: En catch blocks, `error` es de tipo `unknown`.

**Solución**: Verificar tipo antes de usar:
```typescript
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(errorMessage || `Error al crear token en Wompi: ${response.status}`);
}
```

---

### Grupo 7: Roles Service - Parámetros implícitos any

#### roles.service.ts

**Línea 57, 108, 324:**

```typescript
// Antes:
permisos.map(p => ({

// Después:
permisos.map((p: any) => ({
```

O mejor, definir el tipo correcto si es posible.

---

### Grupo 8: validateDto - Tipos de parámetros

Ya corregido en rutas, pero verificar que no haya más.

---

## 🎯 Orden de Prioridad

1. **Críticos (compilación):**
   - Errores de tipos de Stripe Subscription
   - Error de tipo de estado
   - Logger.warn con 3 parámetros

2. **Importantes (LogData):**
   - Mover propiedades a detalle/metadata

3. **Menores:**
   - Tipos null/undefined
   - Parámetros any implícitos

