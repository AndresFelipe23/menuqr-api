# 🔄 Flujo de Suscripción - Planes PRO y PREMIUM

## 📋 Secuencia Completa

### **Escenario 1: Suscripción durante el Registro**

```
1. Usuario en Landing Page
   └─> Click en "Comenzar Gratis" o "Comenzar Ahora" (PRO/PREMIUM)
   └─> Redirige a /register

2. Página de Registro
   └─> Usuario completa formulario:
       - Email
       - Contraseña
       - Nombre
       - Nombre del restaurante
       - Slug del restaurante
   └─> NUEVO: Selección de Plan (FREE, PRO, PREMIUM)
   └─> Si selecciona PRO o PREMIUM:
       └─> Mostrar selector: Mensual o Anual
       └─> Mostrar formulario de pago (Stripe Elements)
       └─> Usuario ingresa datos de tarjeta

3. Procesamiento
   └─> Backend crea restaurante con estado_suscripcion = 'free' (temporal)
   └─> Backend crea usuario
   └─> Si plan seleccionado es PRO o PREMIUM:
       └─> Frontend crea PaymentMethod en Stripe
       └─> Frontend llama a POST /api/suscripciones con:
           {
             restauranteId: "...",
             tipoPlan: "pro" | "premium",
             isAnnual: true | false,
             paymentMethodId: "pm_..."
           }
       └─> Backend crea suscripción en Stripe
       └─> Backend actualiza estado_suscripcion en restaurante
   └─> Si plan es FREE:
       └─> Backend crea suscripción FREE automáticamente (ya implementado)

4. Resultado
   └─> Usuario autenticado
   └─> Redirige a /dashboard
   └─> Suscripción activa según plan seleccionado
```

### **Escenario 2: Upgrade después del Registro (Usuario ya registrado)**

```
1. Usuario en Dashboard (con plan FREE)
   └─> Ve banner o sección "Actualizar Plan"
   └─> Click en "Actualizar a PRO" o "Actualizar a PREMIUM"

2. Página de Selección de Plan
   └─> Muestra planes disponibles (PRO, PREMIUM)
   └─> Muestra plan actual (FREE)
   └─> Usuario selecciona plan y período (Mensual/Anual)
   └─> Formulario de pago (Stripe Elements)

3. Procesamiento
   └─> Frontend crea PaymentMethod en Stripe
   └─> Frontend llama a POST /api/suscripciones con:
       {
         restauranteId: user.restauranteId,
         tipoPlan: "pro" | "premium",
         isAnnual: true | false,
         paymentMethodId: "pm_..."
       }
   └─> Backend verifica que no tenga suscripción activa (o cancela la anterior)
   └─> Backend crea nueva suscripción en Stripe
   └─> Backend actualiza estado_suscripcion

4. Resultado
   └─> Suscripción actualizada
   └─> Usuario puede usar nuevas funcionalidades
   └─> Webhook de Stripe confirma el pago
```

---

## 🔧 Implementación Técnica

### **1. Frontend: Integración de Stripe Elements**

#### Instalación
```bash
cd frontend_administrador
npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### Componente de Pago
```typescript
// src/components/StripePaymentForm.tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Componente para capturar tarjeta
function PaymentForm({ planType, isAnnual, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Crear PaymentMethod
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
    
    if (error) {
      onError(error.message);
      return;
    }
    
    // Llamar al backend para crear suscripción
    const response = await fetch('/api/suscripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restauranteId: user.restauranteId,
        tipoPlan: planType,
        isAnnual,
        paymentMethodId: paymentMethod.id,
      }),
    });
    
    if (response.ok) {
      onSuccess();
    } else {
      onError('Error al procesar el pago');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Confirmar Pago</button>
    </form>
  );
}
```

### **2. Backend: Endpoint de Suscripción**

#### Ya implementado ✅
- `POST /api/suscripciones` - Crea suscripción
- Requiere: `restauranteId`, `tipoPlan`, `paymentMethodId` (para PRO/PREMIUM)
- Crea cliente en Stripe si no existe
- Adjunta método de pago
- Crea suscripción recurrente

#### Flujo Backend
```typescript
// backend/src/services/suscripciones.service.ts

async crear(crearSuscripcionDto) {
  // 1. Verificar restaurante existe
  // 2. Verificar no tenga suscripción activa
  // 3. Si es FREE → crear en BD directamente
  // 4. Si es PRO/PREMIUM:
  //    a. Obtener priceId según plan y período
  //    b. Crear/obtener cliente en Stripe
  //    c. Adjuntar paymentMethod
  //    d. Crear suscripción en Stripe
  //    e. Guardar en BD
  // 5. Actualizar estado_suscripcion en restaurante
}
```

### **3. Webhooks de Stripe**

#### Ya implementado ✅
- `POST /api/webhooks/stripe` - Recibe eventos de Stripe
- Eventos manejados:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

#### Flujo Webhook
```
Stripe → Webhook → Backend
  └─> Actualiza suscripción en BD
  └─> Actualiza estado_suscripcion en restaurante
  └─> Registra pago en tabla pagos
```

---

## 📝 Pasos para Implementar

### **Paso 1: Actualizar Página de Registro**

```typescript
// frontend_administrador/src/pages/RegisterPage.tsx

1. Agregar selector de plan:
   - Radio buttons: FREE, PRO, PREMIUM
   - Si PRO/PREMIUM: mostrar selector Mensual/Anual

2. Si plan es PRO o PREMIUM:
   - Mostrar formulario de pago (Stripe Elements)
   - Capturar datos de tarjeta

3. Al enviar formulario:
   - Si FREE: registrar normalmente (ya funciona)
   - Si PRO/PREMIUM:
     a. Crear PaymentMethod
     b. Registrar usuario
     c. Crear suscripción con paymentMethodId
```

### **Paso 2: Crear Página de Actualización de Plan**

```typescript
// frontend_administrador/src/pages/UpgradePlanPage.tsx

1. Mostrar plan actual
2. Mostrar planes disponibles (PRO, PREMIUM)
3. Selector de período (Mensual/Anual)
4. Formulario de pago (Stripe Elements)
5. Procesar upgrade
```

### **Paso 3: Variables de Entorno**

```env
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Backend (ya configurado)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...
```

---

## 🎯 Flujo Detallado: Cliente obtiene PRO/PREMIUM

### **Opción A: Durante Registro**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Landing Page                                         │
│    Usuario click "Comenzar Ahora" (PRO o PREMIUM)      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Página de Registro                                   │
│    - Formulario de datos personales                     │
│    - Selector de Plan: [FREE] [PRO] [PREMIUM]          │
│    - Si PRO/PREMIUM:                                    │
│      • Selector: [Mensual] [Anual]                     │
│      • Formulario de tarjeta (Stripe Elements)         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Frontend: Procesamiento                              │
│    a. Validar formulario                                │
│    b. Si PRO/PREMIUM:                                   │
│       - Crear PaymentMethod en Stripe                   │
│       - Obtener paymentMethodId                        │
│    c. Llamar a POST /api/auth/register                 │
│       (crea restaurante y usuario)                       │
│    d. Si PRO/PREMIUM:                                   │
│       - Llamar a POST /api/suscripciones                │
│         con paymentMethodId                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Backend: Crear Suscripción                          │
│    a. Verificar restaurante existe                      │
│    b. Obtener priceId según plan y período              │
│    c. Crear/obtener Customer en Stripe                  │
│    d. Adjuntar PaymentMethod al Customer                │
│    e. Crear Subscription en Stripe                      │
│    f. Guardar suscripción en BD                        │
│    g. Actualizar estado_suscripcion = 'active'          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Stripe: Procesa Pago                                │
│    - Carga inicial (primer mes/año)                     │
│    - Envía webhook a backend                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Webhook: Confirmar Pago                              │
│    - Backend recibe invoice.payment_succeeded            │
│    - Actualiza suscripción en BD                        │
│    - Registra pago en tabla pagos                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Frontend: Redirigir                                  │
│    - Usuario autenticado                                │
│    - Redirige a /dashboard                              │
│    - Plan activo (PRO o PREMIUM)                        │
└─────────────────────────────────────────────────────────┘
```

### **Opción B: Upgrade después del Registro**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario en Dashboard (plan FREE)                     │
│    - Ve banner "Actualizar Plan"                        │
│    - O va a /dashboard/settings                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Página de Selección de Plan                          │
│    - Muestra plan actual: FREE                          │
│    - Muestra planes: PRO ($9/mes) y PREMIUM ($14/mes)  │
│    - Usuario selecciona plan y período                  │
│    - Formulario de pago (Stripe Elements)               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Frontend: Procesamiento                              │
│    a. Crear PaymentMethod en Stripe                      │
│    b. Llamar a POST /api/suscripciones                  │
│       con paymentMethodId                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Backend: Crear Nueva Suscripción                     │
│    a. Verificar restaurante                             │
│    b. Si tiene suscripción FREE activa:                 │
│       - Cancelar suscripción FREE (o mantener)          │
│    c. Crear nueva suscripción PRO/PREMIUM en Stripe     │
│    d. Guardar en BD                                     │
│    e. Actualizar estado_suscripcion                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Stripe: Procesa Pago y Webhook                       │
│    (igual que Opción A)                                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Frontend: Actualizar UI                              │
│    - Mostrar nuevo plan activo                          │
│    - Desbloquear funcionalidades premium                │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Consideraciones Importantes

### **1. Manejo de Errores**
- Pago rechazado → Mostrar error, permitir reintentar
- Tarjeta inválida → Validar con Stripe Elements
- Error de red → Reintentar o guardar estado

### **2. Estados de Carga**
- Mostrar spinner durante procesamiento
- Deshabilitar botones mientras procesa
- Feedback visual claro

### **3. Seguridad**
- PaymentMethod se crea en frontend (Stripe Elements)
- Solo se envía `paymentMethodId` al backend (no datos de tarjeta)
- Backend valida autenticación antes de crear suscripción

### **4. Webhooks**
- Configurar webhook en Stripe Dashboard
- URL: `https://tu-dominio.com/api/webhooks/stripe`
- Verificar firma del webhook

### **5. Pruebas**
- Usar tarjetas de prueba de Stripe
- `4242 4242 4242 4242` - Éxito
- `4000 0000 0000 0002` - Rechazada
- Cualquier fecha futura y CVC

---

## 📦 Archivos a Crear/Modificar

### **Frontend**
1. `frontend_administrador/src/components/StripePaymentForm.tsx` (NUEVO)
2. `frontend_administrador/src/pages/RegisterPage.tsx` (MODIFICAR)
3. `frontend_administrador/src/pages/UpgradePlanPage.tsx` (NUEVO)
4. `frontend_administrador/src/services/suscripciones.service.ts` (NUEVO o MODIFICAR)

### **Backend**
- ✅ Ya implementado: `POST /api/suscripciones`
- ✅ Ya implementado: Webhooks de Stripe
- ✅ Ya implementado: Servicio de suscripciones

---

## 🚀 Próximos Pasos

1. **Instalar Stripe en Frontend**
   ```bash
   cd frontend_administrador
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. **Crear componente de pago**
   - Integrar Stripe Elements
   - Capturar datos de tarjeta
   - Crear PaymentMethod

3. **Actualizar página de registro**
   - Agregar selector de plan
   - Integrar formulario de pago para PRO/PREMIUM

4. **Crear página de upgrade**
   - Mostrar planes disponibles
   - Permitir cambiar de plan

5. **Probar flujo completo**
   - Registro con plan FREE
   - Registro con plan PRO
   - Upgrade de FREE a PREMIUM

