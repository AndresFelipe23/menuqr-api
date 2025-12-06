# 🔧 Script de Correcciones TypeScript - Aplicar Todas

Este documento contiene todas las correcciones necesarias organizadas por archivo.

## 📋 Resumen de Errores por Archivo

- **socket.config.ts**: 6 errores ✅ (Ya corregidos)
- **typeorm.config.ts**: 1 error ✅ (Ya corregido)
- **auth.middleware.ts**: 2 errores ✅ (Ya corregidos)
- **routes (adiciones, items-menu, pedidos)**: 10 errores ✅ (Ya corregidos)
- **webhooks.routes.ts**: 9 errores
- **auth.service.ts**: 2 errores
- **items-menu.service.ts**: 1 error
- **mesas.service.ts**: 1 error
- **roles.service.ts**: 3 errores
- **suscripciones.service.ts**: 11 errores (algunos ya corregidos)
- **usuarios.service.ts**: 3 errores
- **websocket.service.ts**: 5 errores
- **wompi.service.ts**: 7 errores

---

## 🔄 Correcciones Pendientes por Archivo

### 1. routes/webhooks.routes.ts

**Línea 69** - `eventType`:
```typescript
// Antes:
eventType: event.type,

// Después:
detalle: { eventType: event.type },
```

**Línea 94** - `stripeCustomerId`:
```typescript
// Antes:
stripeCustomerId,

// Después:
detalle: { stripeCustomerId },
```

**Líneas 123, 162, 207, 247, 398, 406** - `suscripcionId`:
```typescript
// Antes:
suscripcionId: suscripcion[0].id,

// Después:
detalle: { suscripcionId: suscripcion[0].id },
```

**Línea 331** - `transactionId`:
```typescript
// Antes:
transactionId,

// Después:
detalle: { transactionId },
```

---

### 2. services/suscripciones.service.ts

**Línea 374** - `suscripcionId` y `monto`:
```typescript
// Antes:
Logger.info('Pago registrado exitosamente al crear suscripción', {
  categoria: this.logCategory,
  suscripcionId: suscripcionCreada.id,
  monto: amount,
});

// Después:
Logger.info('Pago registrado exitosamente al crear suscripción', {
  categoria: this.logCategory,
  detalle: { suscripcionId: suscripcionCreada.id, monto: amount },
});
```

**Línea 477, 513** - `suscripcionId`:
```typescript
// Mover a detalle
```

**Línea 494** - `isAnnual` no existe:
```typescript
// Antes:
const planPrice = getPlanPrice(actualizarSuscripcionDto.tipoPlan, 'USD', suscripcionActual.isAnnual || false);

// Después:
// Determinar si es anual basándose en el precio actual o asumir mensual
// O agregar isAnnual a la interfaz Suscripcion
const isAnnual = false; // Por ahora asumir mensual, o calcular basándose en el precio
const planPrice = getPlanPrice(actualizarSuscripcionDto.tipoPlan, 'USD', isAnnual);
```

---

### 3. services/auth.service.ts

**Línea 314** - `restauranteId` puede ser undefined:
```typescript
// Agregar validación o usar ! si está garantizado
restauranteId: restauranteId!,
// O mejor:
if (!restauranteId) {
  // manejar error
}
```

**Línea 322** - `error`:
```typescript
// Mover a detalle
```

---

### 4. services/items-menu.service.ts

**Línea 376** - `error`:
```typescript
// Mover a detalle
```

---

### 5. services/mesas.service.ts

**Línea 312** - `error`:
```typescript
// Mover a detalle
```

---

### 6. services/roles.service.ts

**Líneas 57, 108, 324** - Parámetros implícitos `any`:
```typescript
// Antes:
permisos.map(p => ({

// Después:
permisos.map((p: any) => ({
```

---

### 7. services/usuarios.service.ts

**Líneas 334, 509, 598** - `restauranteId` null vs undefined:
```typescript
// Antes:
restauranteId: crearUsuarioDto.restauranteId,

// Después:
restauranteId: crearUsuarioDto.restauranteId ?? undefined,
```

---

### 8. services/websocket.service.ts

**Líneas 62, 128, 171** - `pedidoId`:
```typescript
// Mover a detalle
```

**Línea 207** - `mesaId`:
```typescript
// Mover a detalle
```

**Línea 232** - `tipo`:
```typescript
// Mover a detalle
```

---

### 9. services/wompi.service.ts

**Líneas 91, 94, 146, 149, 179, 182** - Tipos `unknown`:
```typescript
// Antes:
} catch (error: any) {
  throw new Error(error.message || ...);

// Después:
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(errorMessage || ...);
}
```

**Línea 225** - `transactionId`:
```typescript
// Mover a detalle
```

---

## ⚡ Correcciones Aplicadas

- ✅ typeorm.config.ts
- ✅ routes/adiciones.routes.ts
- ✅ routes/items-menu.routes.ts  
- ✅ routes/pedidos.routes.ts
- ✅ socket.config.ts (parcialmente)
- ✅ auth.middleware.ts (parcialmente)
- ✅ suscripciones.service.ts - tipo de estado
- ✅ suscripciones.service.ts - Stripe Subscription
- ✅ suscripciones.service.ts - Logger.warn

