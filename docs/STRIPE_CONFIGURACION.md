# Configuración de Stripe para Suscripciones y Pagos

## ⚠️ Consideraciones sobre el País de la Cuenta Stripe

### Stripe en Colombia vs México

**Stripe SÍ está disponible en Colombia**, pero si creaste tu cuenta con México, hay algunas consideraciones:

#### ✅ **Ventajas de usar cuenta de México:**
- Stripe México está completamente operativo
- Soporta pagos con tarjetas mexicanas
- Puedes recibir pagos en MXN (Pesos Mexicanos)
- Proceso de verificación más rápido

#### ⚠️ **Consideraciones importantes:**
1. **Moneda principal**: Tu cuenta de Stripe México procesará pagos principalmente en MXN
2. **Tarjetas aceptadas**: Funcionará mejor con tarjetas mexicanas, aunque también acepta tarjetas internacionales
3. **Facturación**: Los recibos y facturas se emitirán desde México
4. **Impuestos**: Debes considerar las obligaciones fiscales según tu ubicación real

### 💡 **Recomendación:**
Si estás en Colombia, considera:
- **Opción 1**: Crear una cuenta Stripe Colombia (si está disponible en tu región)
- **Opción 2**: Usar la cuenta de México pero configurar precios en múltiples monedas (MXN, COP, USD)
- **Opción 3**: Usar USD como moneda base (más universal)

## 🔧 Configuración del Sistema

### 1. Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env`:

```env
# Stripe - Configuración Principal
STRIPE_SECRET_KEY=sk_test_... # Tu clave secreta de Stripe
STRIPE_WEBHOOK_SECRET=whsec_... # Secreto del webhook (obtener después de configurar webhook)

# Stripe - Price IDs (todos en USD)
# Planes mensuales
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PREMIUM=price_...

# Planes anuales (con descuento - 2 meses gratis)
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...

# Nota: El plan FREE no requiere configuración en Stripe (es permanente y gratuito)
```

### 2. Crear Productos y Precios en Stripe Dashboard

#### Paso 1: Crear Productos
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Crea 2 productos (FREE no requiere Stripe):
   - **Plan Pro** (Pro Plan)
   - **Plan Premium** (Premium Plan)

#### Paso 2: Crear Precios en USD

Para cada producto, crea **DOS precios** (mensual y anual):

**Plan Pro:**
- **Mensual**: $9/mes (recurring, monthly) → Copia el `price_id` a `STRIPE_PRICE_ID_PRO`
- **Anual**: $90/año (recurring, yearly) → Copia el `price_id` a `STRIPE_PRICE_ID_PRO_ANNUAL`
  - *Nota: $90 = 10 meses de $9 (2 meses gratis)*

**Plan Premium:**
- **Mensual**: $14/mes (recurring, monthly) → Copia el `price_id` a `STRIPE_PRICE_ID_PREMIUM`
- **Anual**: $140/año (recurring, yearly) → Copia el `price_id` a `STRIPE_PRICE_ID_PREMIUM_ANNUAL`
  - *Nota: $140 = 10 meses de $14 (2 meses gratis)*

#### Paso 3: Copiar los Price IDs
Cada precio tiene un ID único que empieza con `price_`. Copia estos IDs a las variables de entorno.

### 3. Configurar Webhook

#### Paso 1: Crear Webhook Endpoint
1. Ve a Stripe Dashboard → Developers → Webhooks
2. Click en "Add endpoint"
3. URL del endpoint: `https://tu-dominio.com/api/webhooks/stripe`
4. Selecciona los eventos a escuchar:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

#### Paso 2: Obtener Webhook Secret
1. Después de crear el webhook, click en el endpoint
2. Copia el "Signing secret" (empieza con `whsec_`)
3. Agrégala a `STRIPE_WEBHOOK_SECRET` en tu `.env`

### 4. Moneda del Sistema

El sistema está configurado para usar **USD** como moneda única para todas las suscripciones. 

Los restaurantes pueden tener su moneda configurada en la tabla `restaurantes` para mostrar precios en su menú, pero las suscripciones siempre se procesan en USD.

## 📋 Planes Disponibles

### FREE (Gratis)
- **Duración**: ✅ **Permanente** (sin límite de tiempo)
- **Precio**: $0/mes
- **Límites**:
  - 15 items en el menú
  - 5 mesas
  - 1 usuario (solo administrador)
  - ❌ Sin WebSockets (actualizaciones manuales)
  - ❌ Sin analytics
- **Nota**: No requiere configuración en Stripe, se crea automáticamente al registrar restaurante

### PRO (Profesional)
- **Precio**: 
  - $9 USD/mes (mensual)
  - $90 USD/año (anual - **2 meses gratis** 💰)
- **Límites**:
  - ✅ Items ilimitados
  - ✅ Mesas ilimitadas
  - ✅ Usuarios ilimitados
  - ✅ WebSockets (tiempo real)
  - ✅ Personalización completa

### Premium (Avanzado)
- **Precio**: 
  - $14 USD/mes (mensual)
  - $140 USD/año (anual - **2 meses gratis** 💰)
- **Límites**:
  - ✅ Todo lo de PRO +
  - ✅ Analytics y reportes avanzados
  - ✅ Reservas de mesas
  - ✅ Promociones y descuentos
  - ✅ Reseñas y calificaciones
  - ✅ Gestión de stock/inventario
  - ✅ Integración con delivery
  - ✅ API personalizada
  - ✅ White-label (opcional)

## 🔄 Flujo de Suscripción

1. **Cliente selecciona plan** → Frontend muestra precios en USD
2. **Cliente ingresa método de pago** → Stripe Elements o Checkout
3. **Backend crea suscripción** → Usa el `price_id` en USD
4. **Stripe procesa pago** → Webhook notifica al backend
5. **Backend actualiza estado** → Suscripción activa en BD

## ⚠️ Notas Importantes

1. **Modo Test vs Producción**:
   - Usa `sk_test_...` para desarrollo
   - Usa `sk_live_...` para producción
   - Los webhooks también tienen secrets diferentes para test y live

2. **Facturación en USD**:
   - Todas las suscripciones se facturan en USD
   - Stripe maneja automáticamente la conversión para tarjetas internacionales
   - Los clientes verán el cargo en su moneda local según su banco

4. **Webhooks en Desarrollo**:
   - Usa [Stripe CLI](https://stripe.com/docs/stripe-cli) para probar webhooks localmente:
   ```bash
   stripe listen --forward-to localhost:5290/api/webhooks/stripe
   ```

## 🧪 Probar la Integración

1. Usa tarjetas de prueba de Stripe:
   - Éxito: `4242 4242 4242 4242`
   - Fallo: `4000 0000 0000 0002`
   - Cualquier fecha futura y CVC

2. Verifica en Stripe Dashboard que:
   - Los clientes se crean correctamente
   - Las suscripciones se activan
   - Los pagos se registran

3. Verifica en tu base de datos que:
   - La suscripción se crea en la tabla `suscripciones`
   - El estado del restaurante se actualiza
   - Los pagos se registran en la tabla `pagos`

