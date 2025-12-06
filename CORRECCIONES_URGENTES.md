# 🚨 Correcciones Urgentes - Aplicar Ahora

Estas son las correcciones más críticas que impiden la compilación. Aplica estas primero.

## ✅ Ya Corregidos

1. ✅ typeorm.config.ts - `connectTimeout`
2. ✅ routes/*.routes.ts - `validateDto` → `validateQuery`
3. ✅ socket.config.ts - LogData
4. ✅ auth.middleware.ts - LogData
5. ✅ suscripciones.service.ts - tipo estado, Stripe Subscription, Logger.warn, algunos LogData

## 🔄 Correcciones Pendientes Críticas

### 1. services/suscripciones.service.ts

**Línea 477, 513** - Mover `suscripcionId` a detalle:
```typescript
// Ya corregido línea 477
// Línea 513:
detalle: { suscripcionId },
```

**Línea 494** - `isAnnual`:
```typescript
// Ya corregido - usar false por defecto
```

### 2. routes/webhooks.routes.ts

**Línea 69** - `eventType`:
```typescript
detalle: { eventType: event.type },
```

**Líneas 94, 123, 162, 207, 247, 331, 398, 406** - Mover propiedades a detalle:
```typescript
detalle: { 
  stripeCustomerId,
  suscripcionId: ...,
  transactionId: ...,
}
```

### 3. services/wompi.service.ts

**Líneas 91, 146, 179** - Tipos `unknown`:
```typescript
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(errorMessage || ...);
}
```

**Línea 225** - `transactionId`:
```typescript
detalle: { transactionId: ... },
```

### 4. Otros servicios - LogData

Mover todas las propiedades no válidas a `detalle`:
- `error` → `detalle: { error: ... }`
- `pedidoId` → `detalle: { pedidoId: ... }`
- `mesaId` → `detalle: { mesaId: ... }`
- `tipo` → `detalle: { tipo: ... }`

### 5. services/roles.service.ts

**Líneas 57, 108, 324**:
```typescript
permisos.map((p: any) => ({
```

### 6. services/usuarios.service.ts

**Líneas 334, 509, 598**:
```typescript
restauranteId: crearUsuarioDto.restauranteId ?? undefined,
```

### 7. services/auth.service.ts

**Línea 314** - Validar `restauranteId`:
```typescript
if (!restauranteId) {
  this.handleError('...', null, 400);
}
```

**Línea 322** - Mover `error` a detalle:
```typescript
detalle: { error: error.message },
```

