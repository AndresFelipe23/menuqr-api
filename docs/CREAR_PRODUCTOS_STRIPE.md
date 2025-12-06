# 🛍️ Crear Productos y Precios en Stripe Dashboard

## 📋 Resumen Rápido

Necesitas crear **2 productos** con **2 precios cada uno** (mensual y anual).

---

## 🚀 Pasos Detallados

### **Paso 1: Crear Producto "Plan Pro"**

1. Ve a [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Click en **"Add product"** (o **"+"** en la esquina superior derecha)
3. Completa:
   - **Name**: `Plan Pro`
   - **Description**: `Plan profesional para restaurantes con todas las funcionalidades actuales`
   - **Images**: (opcional) Puedes subir una imagen
4. Click en **"Save product"**

### **Paso 2: Crear Precios para "Plan Pro"**

#### Precio Mensual ($9/mes):
1. En el producto "Plan Pro", click en **"Add price"**
2. Configura:
   - **Price**: `9.00`
   - **Currency**: `USD` (United States Dollar)
   - **Billing period**: Selecciona **"Monthly"** (recurring)
   - **Recurring**: ✅ Debe estar marcado
3. Click en **"Add price"**
4. **IMPORTANTE**: Copia el **Price ID** (empieza con `price_...`)
   - Lo encontrarás en la lista de precios del producto
   - O en la URL cuando edites el precio
5. Pégalo en `backend/.env` como:
   ```env
   STRIPE_PRICE_ID_PRO=price_...
   ```

#### Precio Anual ($90/año):
1. En el mismo producto "Plan Pro", click en **"Add another price"**
2. Configura:
   - **Price**: `90.00`
   - **Currency**: `USD`
   - **Billing period**: Selecciona **"Yearly"** (recurring)
   - **Recurring**: ✅ Debe estar marcado
3. Click en **"Add price"**
4. **IMPORTANTE**: Copia el **Price ID**
5. Pégalo en `backend/.env` como:
   ```env
   STRIPE_PRICE_ID_PRO_ANNUAL=price_...
   ```

---

### **Paso 3: Crear Producto "Plan Premium"**

1. Ve a [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Click en **"Add product"**
3. Completa:
   - **Name**: `Plan Premium`
   - **Description**: `Plan avanzado con funcionalidades premium y nuevas características`
   - **Images**: (opcional)
4. Click en **"Save product"**

### **Paso 4: Crear Precios para "Plan Premium"**

#### Precio Mensual ($14/mes):
1. En el producto "Plan Premium", click en **"Add price"**
2. Configura:
   - **Price**: `14.00`
   - **Currency**: `USD`
   - **Billing period**: **"Monthly"** (recurring)
3. Click en **"Add price"**
4. Copia el **Price ID**
5. Pégalo en `backend/.env` como:
   ```env
   STRIPE_PRICE_ID_PREMIUM=price_...
   ```

#### Precio Anual ($140/año):
1. En el mismo producto "Plan Premium", click en **"Add another price"**
2. Configura:
   - **Price**: `140.00`
   - **Currency**: `USD`
   - **Billing period**: **"Yearly"** (recurring)
3. Click en **"Add price"**
4. Copia el **Price ID**
5. Pégalo en `backend/.env` como:
   ```env
   STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...
   ```

---

## ✅ Checklist Final

Después de completar todos los pasos, tu `backend/.env` debería tener:

```env
# Stripe - Configuración Principal
# ⚠️ IMPORTANTE: Reemplaza estos valores con tus credenciales reales
STRIPE_SECRET_KEY=sk_test_...  # Obtén tu clave en Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...  # Obtén tu secreto después de configurar el webhook

# Stripe - Price IDs (obtén estos del Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...
```

Y tu `frontend_administrador/.env` debería tener:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🔍 Dónde Encontrar los Price IDs

### Opción 1: Desde Products (Recomendado) ⭐
1. Ve a [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Click en el producto (ej: "Plan Pro")
3. En la sección **"Pricing"**, verás todos los precios asociados
4. Cada precio muestra su **Price ID** (empieza con `price_...`)
5. **Click en el Price ID** para copiarlo o copia directamente el texto

### Opción 2: Desde Payment Links
Si creaste Payment Links:
1. Ve a [Stripe Dashboard → Payment Links](https://dashboard.stripe.com/test/payment_links)
2. Click en el Payment Link que creaste
3. En los detalles, verás el **Price ID** asociado
4. O click en "View price details" para ver el Price ID completo

### Opción 3: Desde la URL
1. Click en un precio para editarlo
2. La URL será algo como: `https://dashboard.stripe.com/test/products/prod_.../prices/price_...`
3. El Price ID es la parte que dice `price_...` en la URL

### Opción 4: Desde los Logs/Eventos
Si ves eventos como en la imagen que compartiste:
- Busca mensajes como: `"Se ha creado un nuevo precio llamado price_..."`
- El Price ID es el que aparece después de "price_"
- Ejemplo: `price_1Sb85kP56uOLC2LMDdOyxws7` ✅

---

## ⚠️ Notas Importantes

1. **Modo Test**: Asegúrate de estar en **modo Test** (no Live) cuando crees los productos
2. **Recurring**: Los precios DEBEN ser recurrentes (recurring), no one-time
3. **USD**: Todos los precios deben estar en USD
4. **Price IDs únicos**: Cada precio tiene su propio ID único, no los confundas
5. **No cambian**: Los Price IDs no cambian una vez creados

---

## 🧪 Verificar que Todo Está Correcto

Después de agregar todos los Price IDs al `.env`, reinicia tu servidor backend:

```bash
cd backend
npm run dev
```

Si no hay errores sobre Price IDs faltantes, ¡todo está bien configurado! ✅

