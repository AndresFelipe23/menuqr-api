# 🔑 Credenciales de Stripe - Guía Completa

## 📋 Variables de Entorno Necesarias

### **Backend** (`backend/.env`)

```env
# ============================================
# STRIPE - Configuración Principal
# ============================================

# 1. Clave Secreta de Stripe (Secret Key)
# Obtener en: https://dashboard.stripe.com/test/apikeys (modo test)
# O en: https://dashboard.stripe.com/apikeys (modo producción)
STRIPE_SECRET_KEY=sk_test_51... # Para desarrollo (empieza con sk_test_)
# STRIPE_SECRET_KEY=sk_live_51... # Para producción (empieza con sk_live_)

# 2. Secreto del Webhook (Webhook Secret)
# Obtener después de configurar el webhook en Stripe Dashboard
# Ve a: Developers → Webhooks → Click en tu endpoint → "Signing secret"
STRIPE_WEBHOOK_SECRET=whsec_... # Empieza con whsec_

# ============================================
# STRIPE - Price IDs (IDs de Precios)
# ============================================
# Estos IDs se obtienen después de crear los productos y precios en Stripe Dashboard

# Plan PRO - Mensual ($9/mes)
STRIPE_PRICE_ID_PRO=price_...

# Plan PRO - Anual ($90/año)
STRIPE_PRICE_ID_PRO_ANNUAL=price_...

# Plan PREMIUM - Mensual ($14/mes)
STRIPE_PRICE_ID_PREMIUM=price_...

# Plan PREMIUM - Anual ($140/año)
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...
```

### **Frontend** (`frontend_administrador/.env`)

```env
# ============================================
# STRIPE - Clave Pública (Publishable Key)
# ============================================
# Esta clave es segura para usar en el frontend (pública)
# Obtener en: https://dashboard.stripe.com/test/apikeys (modo test)
# O en: https://dashboard.stripe.com/apikeys (modo producción)

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51... # Para desarrollo (empieza con pk_test_)
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51... # Para producción (empieza con pk_live_)
```

---

## 🔍 Dónde Obtener Cada Credencial

### **1. STRIPE_SECRET_KEY (Backend)**

**Pasos:**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Asegúrate de estar en **modo Test** (toggle en la esquina superior derecha)
3. Ve a **Developers** → **API keys**
4. En la sección **Secret key**, click en **Reveal test key**
5. Copia la clave que empieza con `sk_test_...`
6. Pégala en `backend/.env` como `STRIPE_SECRET_KEY`

**⚠️ Importante:**
- **Test**: Usa `sk_test_...` para desarrollo
- **Producción**: Usa `sk_live_...` cuando estés listo para producción
- **NUNCA** compartas esta clave públicamente
- **NUNCA** la subas a Git (debe estar en `.gitignore`)

---

### **2. VITE_STRIPE_PUBLISHABLE_KEY (Frontend)**

**Pasos:**
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Asegúrate de estar en **modo Test**
3. Ve a **Developers** → **API keys**
4. En la sección **Publishable key**, copia la clave que empieza con `pk_test_...`
5. Pégala en `frontend_administrador/.env` como `VITE_STRIPE_PUBLISHABLE_KEY`

**⚠️ Importante:**
- Esta clave es **pública** y segura para usar en el frontend
- **Test**: Usa `pk_test_...` para desarrollo
- **Producción**: Usa `pk_live_...` para producción

---

### **3. STRIPE_WEBHOOK_SECRET (Backend)**

**⚠️ IMPORTANTE**: Necesitas una URL pública para configurar el webhook. Tienes 2 opciones:

#### **Opción A: Desarrollo Local con ngrok (Recomendado)**

1. **Instala ngrok**: https://ngrok.com/download
2. **Inicia tu servidor backend** (puerto 5290)
3. **En otra terminal, ejecuta**:
   ```bash
   ngrok http 5290
   ```
4. **Copia la URL HTTPS** que ngrok te da (ej: `https://abc123.ngrok.io`)
5. **Ve a Stripe Dashboard** → **Developers** → **Webhooks**
6. **Click en "Add endpoint"**
7. **Endpoint URL**: Ingresa `https://abc123.ngrok.io/api/webhooks/stripe` (usa tu URL de ngrok)
8. **Selecciona los 5 eventos** (ver más abajo)
9. **Click en "Add endpoint"**
10. **Copia el Signing secret** (whsec_...) y pégalo en `backend/.env`

#### **Opción B: Desarrollo Local con Stripe CLI**

1. **Instala Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Ejecuta**:
   ```bash
   stripe listen --forward-to localhost:5290/api/webhooks/stripe
   ```
3. **Stripe CLI te dará un webhook secret** - úsalo en tu `.env`
4. **NO necesitas configurar el webhook en Dashboard**

#### **Opción C: Producción**

1. **Ve a Stripe Dashboard** → **Developers** → **Webhooks**
2. **Click en "Add endpoint"**
3. **Endpoint URL**: `https://tu-dominio.com/api/webhooks/stripe`
4. **Selecciona los 5 eventos** (ver más abajo)
5. **Click en "Add endpoint"**
6. **Copia el Signing secret** y pégalo en `backend/.env`

**Eventos a seleccionar** (OBLIGATORIO):
   
   ✅ **customer.subscription.created**
   ✅ **customer.subscription.updated**
   ✅ **customer.subscription.deleted**
   ✅ **invoice.payment_succeeded**
   ✅ **invoice.payment_failed**
   
   **Tip**: Busca cada evento en el buscador o selecciona solo estos 5.

**⚠️ Importante:**
- Cada endpoint tiene su propio secreto único
- Si cambias el endpoint, necesitas actualizar el secreto
- **Test y Producción** tienen secrets diferentes

---

### **4. STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_PRO_ANNUAL, etc. (Backend)**

**Pasos:**

#### Paso 1: Crear Productos
1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Ve a **Products**
3. Click en **Add product**
4. Crea **Plan Pro**:
   - **Name**: `Plan Pro`
   - **Description**: `Plan profesional para restaurantes`
   - Click en **Save product**
5. Repite para crear **Plan Premium**

#### Paso 2: Crear Precios para Plan Pro
1. En el producto **Plan Pro**, click en **Add price**
2. **Precio Mensual**:
   - **Price**: `9.00`
   - **Currency**: `USD`
   - **Billing period**: `Monthly` (recurring)
   - Click en **Add price**
   - **Copia el Price ID** (empieza con `price_...`)
   - Pégalo en `STRIPE_PRICE_ID_PRO`
3. **Precio Anual**:
   - Click en **Add another price**
   - **Price**: `90.00`
   - **Currency**: `USD`
   - **Billing period**: `Yearly` (recurring)
   - Click en **Add price**
   - **Copia el Price ID**
   - Pégalo en `STRIPE_PRICE_ID_PRO_ANNUAL`

#### Paso 3: Crear Precios para Plan Premium
1. En el producto **Plan Premium**, click en **Add price**
2. **Precio Mensual**:
   - **Price**: `14.00`
   - **Currency**: `USD`
   - **Billing period**: `Monthly` (recurring)
   - Click en **Add price**
   - **Copia el Price ID**
   - Pégalo en `STRIPE_PRICE_ID_PREMIUM`
3. **Precio Anual**:
   - Click en **Add another price**
   - **Price**: `140.00`
   - **Currency**: `USD`
   - **Billing period**: `Yearly` (recurring)
   - Click en **Add price**
   - **Copia el Price ID**
   - Pégalo en `STRIPE_PRICE_ID_PREMIUM_ANNUAL`

**⚠️ Importante:**
- Los Price IDs son únicos y no cambian
- Cada precio tiene su propio ID
- Asegúrate de copiar el ID correcto (mensual vs anual)

---

## 📝 Ejemplo Completo de `.env`

### `backend/.env`



## ✅ Checklist de Configuración

### Backend
- [ ] `STRIPE_SECRET_KEY` configurada (sk_test_... o sk_live_...)
- [ ] `STRIPE_WEBHOOK_SECRET` configurada (whsec_...)
- [ ] `STRIPE_PRICE_ID_PRO` configurada (price_...)
- [ ] `STRIPE_PRICE_ID_PRO_ANNUAL` configurada (price_...)
- [ ] `STRIPE_PRICE_ID_PREMIUM` configurada (price_...)
- [ ] `STRIPE_PRICE_ID_PREMIUM_ANNUAL` configurada (price_...)

### Frontend
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` configurada (pk_test_... o pk_live_...)

### Stripe Dashboard
- [ ] Producto "Plan Pro" creado
- [ ] Precio mensual $9 para Plan Pro creado
- [ ] Precio anual $90 para Plan Pro creado
- [ ] Producto "Plan Premium" creado
- [ ] Precio mensual $14 para Plan Premium creado
- [ ] Precio anual $140 para Plan Premium creado
- [ ] Webhook configurado con los eventos necesarios
- [ ] Webhook secret copiado

---

## 🧪 Probar la Configuración

### 1. Verificar Backend
```bash
cd backend
npm run dev
# Si no hay errores sobre STRIPE_SECRET_KEY, está bien configurado
```

### 2. Verificar Frontend
```bash
cd frontend_administrador
npm run dev
# Verifica en la consola que no haya errores sobre VITE_STRIPE_PUBLISHABLE_KEY
```

### 3. Probar con Tarjetas de Prueba
- **Éxito**: `4242 4242 4242 4242`
- **Rechazada**: `4000 0000 0000 0002`
- **Cualquier fecha futura** (ej: 12/25)
- **Cualquier CVC** (ej: 123)

---

## 🔒 Seguridad

### ⚠️ NUNCA hagas esto:
- ❌ Subir las claves a Git
- ❌ Compartir `STRIPE_SECRET_KEY` públicamente
- ❌ Usar claves de producción en desarrollo
- ❌ Hardcodear las claves en el código

### ✅ SÍ haz esto:
- ✅ Usar `.env` para las variables
- ✅ Agregar `.env` a `.gitignore`
- ✅ Usar claves de test para desarrollo
- ✅ Rotar las claves si se comprometen
- ✅ Usar diferentes claves para test y producción

---

## 📚 Recursos

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
- [Stripe Products](https://dashboard.stripe.com/products)
- [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Stripe CLI (para webhooks locales)](https://stripe.com/docs/stripe-cli)

---

## 🆘 Troubleshooting

### Error: "STRIPE_SECRET_KEY no está configurada"
- Verifica que el archivo `.env` esté en `backend/`
- Verifica que la variable se llame exactamente `STRIPE_SECRET_KEY`
- Reinicia el servidor después de agregar la variable

### Error: "Invalid API Key"
- Verifica que estés usando la clave correcta (test vs live)
- Verifica que no haya espacios extra en el `.env`
- Verifica que la clave esté completa (no cortada)

### Error: "Price ID not found"
- Verifica que hayas creado los productos y precios en Stripe Dashboard
- Verifica que los Price IDs estén correctos en el `.env`
- Verifica que estés usando los IDs del modo correcto (test vs live)

### Webhook no funciona
- Verifica que la URL del webhook sea accesible públicamente
- Para desarrollo local, usa [Stripe CLI](https://stripe.com/docs/stripe-cli)
- Verifica que el `STRIPE_WEBHOOK_SECRET` sea el correcto para tu endpoint

