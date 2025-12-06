# Flujo de Registro y Pago - Solución Implementada

## 📋 Resumen

Se implementó un sistema de **registro sin pago inicial** con **limitaciones automáticas** basadas en el plan de suscripción. Los usuarios pueden registrarse gratuitamente con el plan FREE, pero tienen límites en funcionalidades. Cuando intentan usar funcionalidades premium o alcanzan límites, se les invita a actualizar su plan.

## ✅ Solución Implementada

### 1. **Registro sin Pago (Plan FREE Automático)**

- Al registrarse, se crea automáticamente una suscripción **FREE** permanente
- El usuario puede empezar a usar el sistema inmediatamente
- No se requiere tarjeta de crédito para registrarse

**Ubicación:** `backend/src/services/auth.service.ts` (línea ~310)

```typescript
// Crear suscripción FREE automáticamente (permanente)
const { SuscripcionesService } = await import('./suscripciones.service');
const suscripcionesService = new SuscripcionesService();
await suscripcionesService.crear({
  restauranteId,
  tipoPlan: 'free',
});
```

### 2. **Verificación de Límites en Servicios**

Se agregaron verificaciones automáticas de límites en los servicios críticos:

#### **Items del Menú** (`backend/src/services/items-menu.service.ts`)
- Verifica límite de items antes de crear uno nuevo
- Plan FREE: máximo 15 items
- Plan PRO/PREMIUM: ilimitado

#### **Mesas** (`backend/src/services/mesas.service.ts`)
- Verifica límite de mesas antes de crear una nueva
- Plan FREE: máximo 5 mesas
- Plan PRO/PREMIUM: ilimitado

#### **Usuarios** (pendiente de implementar)
- Plan FREE: máximo 1 usuario (solo administrador)
- Plan PRO/PREMIUM: ilimitado

**Ejemplo de verificación:**
```typescript
const limites = await suscripcionesService.verificarLimites(restauranteId, 'items');
if (!limites.permitido) {
  const mensaje = `Has alcanzado el límite de ${limites.limite} items de tu plan actual (${limites.actual}/${limites.limite}). ` +
    'Por favor, actualiza tu plan para crear más items.';
  this.handleError(mensaje, null, 403);
}
```

### 3. **Banner de Upgrade en Dashboard**

Se agregó un banner promocional para usuarios FREE que:
- Se muestra en el dashboard principal
- Puede cerrarse (se guarda en estado local)
- Muestra beneficios de actualizar a PRO/PREMIUM
- Incluye botón directo a la página de planes

**Ubicación:** `frontend_administrador/src/pages/DashboardPage.tsx`

### 4. **Mensajes de Error Mejorados**

Cuando un usuario alcanza un límite, recibe un mensaje claro que:
- Indica el límite actual alcanzado
- Muestra el uso actual vs. el límite
- Sugiere actualizar el plan
- Incluye información sobre cómo hacerlo

**Ejemplo:**
```
Has alcanzado el límite de 15 items de tu plan actual (15/15). 
Por favor, actualiza tu plan para crear más items.
```

## 🎯 Flujo Completo

### **Registro de Nuevo Usuario**

1. Usuario completa el formulario de registro
2. Se crea el restaurante y usuario administrador
3. **Automáticamente** se crea suscripción FREE
4. Usuario es redirigido al dashboard
5. Ve banner de upgrade (opcional, puede cerrarlo)

### **Uso del Sistema (Plan FREE)**

1. Usuario puede crear hasta 15 items
2. Usuario puede crear hasta 5 mesas
3. Usuario puede tener 1 usuario (solo él)
4. **NO** tiene acceso a WebSockets (actualizaciones manuales)
5. **NO** tiene acceso a analytics avanzado

### **Alcanzar Límites**

1. Usuario intenta crear el item #16
2. Backend verifica límites
3. Retorna error 403 con mensaje descriptivo
4. Frontend muestra mensaje de error
5. Usuario puede hacer clic en "Ver Planes" para actualizar

### **Actualización de Plan**

1. Usuario va a `/dashboard/planes`
2. Ve su plan actual (FREE) y opciones de upgrade
3. Selecciona PRO o PREMIUM
4. Completa el pago con Stripe
5. Suscripción se actualiza automáticamente
6. Límites se expanden inmediatamente

## 📊 Límites por Plan

| Funcionalidad | FREE | PRO | PREMIUM |
|--------------|------|-----|---------|
| Items del menú | 15 | ∞ | ∞ |
| Mesas | 5 | ∞ | ∞ |
| Usuarios | 1 | ∞ | ∞ |
| Categorías | 3 | ∞ | ∞ |
| WebSockets | ❌ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ |
| Reservas | ❌ | ❌ | ✅ |
| Promociones | ❌ | ❌ | ✅ |

## 🔧 Archivos Modificados

### Backend
- `backend/src/services/auth.service.ts` - Creación automática de suscripción FREE
- `backend/src/services/items-menu.service.ts` - Verificación de límites de items
- `backend/src/services/mesas.service.ts` - Verificación de límites de mesas
- `backend/src/services/suscripciones.service.ts` - Método `verificarLimites()` (ya existía)

### Frontend
- `frontend_administrador/src/pages/DashboardPage.tsx` - Banner de upgrade
- `frontend_administrador/src/pages/RegisterPage.tsx` - Diseño mejorado (sin cambios en flujo)
- `frontend_administrador/src/pages/LoginPage.tsx` - Diseño mejorado (sin cambios en flujo)

## 💡 Ventajas de Esta Solución

1. **Baja Fricción de Entrada**: Los usuarios pueden probar el sistema sin pagar
2. **Conversión Natural**: Los límites incentivan la actualización cuando realmente la necesitan
3. **Experiencia Clara**: Los mensajes explican exactamente qué está limitado y cómo solucionarlo
4. **Flexibilidad**: Los usuarios pueden usar el sistema básico sin restricciones molestas
5. **Escalabilidad**: Fácil agregar más verificaciones de límites en el futuro

## 🚀 Próximos Pasos (Opcionales)

1. **Verificación de límites en usuarios**: Agregar check al crear usuarios
2. **Verificación de WebSockets**: Bloquear conexión WebSocket para usuarios FREE
3. **Notificaciones proactivas**: Alertar cuando estén cerca del límite (ej: 13/15 items)
4. **Dashboard de uso**: Mostrar gráfico de uso actual vs. límites
5. **Trial de PRO**: Ofrecer 7 días gratis de PRO después del registro

## 📝 Notas

- El plan FREE es **permanente** (100 años de validez)
- Los límites se verifican en el backend para seguridad
- Los mensajes de error son descriptivos y accionables
- El banner de upgrade puede cerrarse pero se muestra en cada sesión nueva

