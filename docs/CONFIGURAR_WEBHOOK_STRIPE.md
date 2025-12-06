# 🔗 Configurar Webhook de Stripe - Guía Paso a Paso

## 📋 Eventos que Debes Seleccionar

Tu backend está configurado para manejar estos **5 eventos**:

1. ✅ **customer.subscription.created**
2. ✅ **customer.subscription.updated**
3. ✅ **customer.subscription.deleted**
4. ✅ **invoice.payment_succeeded**
5. ✅ **invoice.payment_failed**

---

## 🎯 Pasos Detallados en Stripe Dashboard

### **Paso 1: Ir a Webhooks**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. En el menú lateral, click en **Developers**
3. Click en **Webhooks**

### **Paso 2: Crear Nuevo Endpoint**
1. Click en el botón **Add endpoint** (arriba a la derecha)

### **Paso 3: Configurar Endpoint URL** ⚠️ (OBLIGATORIO)

**Stripe requiere una URL válida y públicamente accesible.** Tienes estas opciones:

#### **Opción A: Desarrollo Local con ngrok (Recomendado para desarrollo)**

Si estás desarrollando localmente y necesitas una URL pública temporal:

1. **Instala ngrok** (gratis):
   - Descarga desde: https://ngrok.com/download
   - O con Chocolatey: `choco install ngrok`

2. **Inicia tu servidor backend**:
   ```bash
   cd backend
   npm run dev
   # El servidor debe estar corriendo en el puerto 5290
   ```

3. **Inicia ngrok en otra terminal**:
   ```bash
   ngrok http 5290
   ```

4. **Copia la URL HTTPS** que ngrok te da:
   ```
   Forwarding  https://abc123def456.ngrok.io -> http://localhost:5290
   ```

5. **Ingresa en Stripe Dashboard**:
   ```
   https://abc123def456.ngrok.io/api/webhooks/stripe
   ```
   (Reemplaza `abc123def456` con tu URL real de ngrok)

**⚠️ Nota**: La URL de ngrok cambia cada vez que lo reinicias (a menos que tengas cuenta de pago). Para desarrollo, esto está bien.

#### **Opción B: Desarrollo Local con Stripe CLI (Alternativa)**

Si prefieres no usar ngrok:

1. **Instala Stripe CLI**:
   - Descarga desde: https://stripe.com/docs/stripe-cli
   - O con Chocolatey: `choco install stripe`

2. **Inicia Stripe CLI**:
   ```bash
   stripe listen --forward-to localhost:5290/api/webhooks/stripe
   ```

3. **Stripe CLI te dará un webhook secret temporal**
4. **NO necesitas configurar el webhook en Dashboard** - Stripe CLI lo maneja automáticamente
5. Usa el webhook secret que te da Stripe CLI en tu `.env`

#### **Opción C: URL de Producción (Si ya tienes servidor)**

Si ya tienes tu backend desplegado en producción:

1. Ingresa la URL completa de tu servidor:
   ```
   https://tu-dominio.com/api/webhooks/stripe
   ```
   
   **Ejemplos:**
   - `https://api.menuqr.com/api/webhooks/stripe`
   - `https://backend.tudominio.com/api/webhooks/stripe`
   - `https://menuqr-backend.herokuapp.com/api/webhooks/stripe`
   - `https://menuqr-backend.railway.app/api/webhooks/stripe`

**⚠️ Requisitos de la URL:**
- ✅ Debe ser **HTTPS** (Stripe no acepta HTTP, excepto localhost en test mode)
- ✅ Debe ser **públicamente accesible** (no `localhost` o `127.0.0.1`)
- ✅ El endpoint debe estar en `/api/webhooks/stripe` (según tu configuración)
- ✅ El servidor debe estar corriendo y accesible

### **Paso 4: Seleccionar Eventos** ⭐ (IMPORTANTE)

En la sección **"Select events to listen to"**, tienes dos opciones:

#### **Opción A: Seleccionar Eventos Específicos (Recomendado)**

1. Click en **"Select events"** o busca en la lista
2. Busca y marca estos 5 eventos:

   ```
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ✅ invoice.payment_succeeded
   ✅ invoice.payment_failed
   ```

3. Puedes usar el buscador para encontrar cada evento rápidamente

#### **Opción B: Seleccionar Todos y Filtrar (Alternativa)**

1. Click en **"Select all events"**
2. Esto seleccionará todos los eventos
3. Luego deselecciona los que no necesitas (pero es más trabajo)

**💡 Recomendación**: Usa la Opción A (seleccionar solo los 5 eventos necesarios)

### **Paso 5: Guardar Endpoint**
1. Click en **Add endpoint** (botón al final)
2. Stripe creará el endpoint y te mostrará los detalles

### **Paso 6: Obtener el Webhook Secret**
1. Después de crear el endpoint, verás la página de detalles
2. En la sección **"Signing secret"**, verás algo como:
   ```
   whsec_1234567890abcdefghijklmnopqrstuvwxyz...
   ```
3. Click en **Reveal** o **Click to reveal** para ver el secreto completo
4. **Copia el secreto completo** (empieza con `whsec_`)
5. Pégalo en tu `backend/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz...
   ```

---

## 🖼️ Visualización de los Eventos

Cuando estés en la pantalla de selección de eventos, verás algo así:

```
Select events to listen to
┌─────────────────────────────────────────┐
│ [🔍 Buscar eventos...]                  │
├─────────────────────────────────────────┤
│ ☐ customer.subscription.created         │ ← Marca este ✅
│ ☐ customer.subscription.updated         │ ← Marca este ✅
│ ☐ customer.subscription.deleted         │ ← Marca este ✅
│ ☐ invoice.payment_succeeded            │ ← Marca este ✅
│ ☐ invoice.payment_failed               │ ← Marca este ✅
│ ☐ customer.created                     │
│ ☐ customer.updated                      │
│ ... (otros eventos)                   │
└─────────────────────────────────────────┘
```

---

## 🧪 Para Desarrollo Local (Stripe CLI)

Si estás desarrollando localmente y tu servidor no es accesible públicamente:

### **Instalar Stripe CLI**
```bash
# Windows (con Chocolatey)
choco install stripe

# O descarga desde: https://stripe.com/docs/stripe-cli
```

### **Usar Stripe CLI**
```bash
# 1. Inicia sesión en Stripe CLI
stripe login

# 2. Reenvía eventos a tu servidor local
stripe listen --forward-to localhost:5290/api/webhooks/stripe

# 3. Stripe CLI te dará un webhook secret temporal
# Úsalo como STRIPE_WEBHOOK_SECRET en tu .env
```

**Nota**: El webhook secret de Stripe CLI es diferente al de producción. Úsalo solo para desarrollo.

---

## ✅ Verificar que Funciona

### **1. Probar el Webhook**
1. En Stripe Dashboard → Webhooks → Tu endpoint
2. Click en **"Send test webhook"**
3. Selecciona un evento (ej: `customer.subscription.created`)
4. Click en **Send test webhook**
5. Verifica en los logs de tu backend que recibió el evento

### **2. Ver Logs del Webhook**
1. En Stripe Dashboard → Webhooks → Tu endpoint
2. Ve a la pestaña **"Logs"**
3. Verás todos los eventos enviados y sus respuestas
4. Si ves `200 OK`, el webhook está funcionando correctamente

---

## 🔒 Seguridad

### **Verificación de Firma**
El backend verifica automáticamente que los webhooks vengan de Stripe usando el `STRIPE_WEBHOOK_SECRET`. Esto previene que terceros envíen eventos falsos.

### **HTTPS Requerido**
En producción, Stripe solo envía webhooks a URLs HTTPS. Asegúrate de que tu servidor tenga SSL configurado.

---

## 🆘 Troubleshooting

### **Error: "Missing signature or secret"**
- Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado en tu `.env`
- Verifica que el secreto sea el correcto para tu endpoint
- Reinicia el servidor después de agregar la variable

### **Error: "Webhook Error: Invalid signature"**
- El secreto del webhook no coincide
- Verifica que estés usando el secreto correcto del endpoint
- Si cambiaste el endpoint, necesitas actualizar el secreto

### **No recibo eventos**
- Verifica que los eventos estén seleccionados en el endpoint
- Verifica que la URL del endpoint sea accesible públicamente
- Verifica los logs en Stripe Dashboard → Webhooks → Tu endpoint → Logs

### **Para desarrollo local**
- Usa Stripe CLI en lugar de configurar un endpoint público
- El webhook secret de Stripe CLI es diferente al de producción

---

## 📝 Resumen Rápido

**Eventos a seleccionar:**
1. ✅ `customer.subscription.created`
2. ✅ `customer.subscription.updated`
3. ✅ `customer.subscription.deleted`
4. ✅ `invoice.payment_succeeded`
5. ✅ `invoice.payment_failed`

**URL del endpoint:**
- Producción: `https://tu-dominio.com/api/webhooks/stripe`
- Desarrollo: Usa Stripe CLI

**Webhook Secret:**
- Copiar de: Stripe Dashboard → Webhooks → Tu endpoint → Signing secret
- Agregar a: `backend/.env` como `STRIPE_WEBHOOK_SECRET`

