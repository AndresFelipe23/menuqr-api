# 📥 Instalar Stripe CLI en Windows

## 🎯 Opción 1: Con Chocolatey (Más Fácil)

Si tienes Chocolatey instalado:

```bash
choco install stripe
```

Luego verifica:
```bash
stripe --version
```

---

## 🎯 Opción 2: Descarga Manual

### **Paso 1: Descargar**
1. Ve a: https://github.com/stripe/stripe-cli/releases/latest
2. Busca la sección **"Assets"**
3. Descarga: `stripe_X.X.X_windows_x86_64.zip` (la versión más reciente)

### **Paso 2: Extraer**
1. Extrae el archivo ZIP
2. Obtendrás un archivo `stripe.exe`

### **Paso 3: Agregar al PATH (Opcional pero Recomendado)**

#### **Opción A: Mover a carpeta en PATH**
1. Mueve `stripe.exe` a una carpeta que esté en tu PATH, por ejemplo:
   - `C:\Windows\System32`
   - O crea una carpeta como `C:\Tools` y agrégalo a PATH

#### **Opción B: Agregar carpeta al PATH**
1. Crea una carpeta: `C:\stripe-cli`
2. Mueve `stripe.exe` ahí
3. Agrega `C:\stripe-cli` a tu PATH:
   - Click derecho en "Este equipo" → Propiedades
   - Configuración avanzada del sistema
   - Variables de entorno
   - En "Variables del sistema", busca "Path"
   - Click en "Editar"
   - Click en "Nuevo"
   - Ingresa: `C:\stripe-cli`
   - Click en "Aceptar" en todas las ventanas
   - **Reinicia la terminal** para que tome efecto

### **Paso 4: Verificar Instalación**
Abre una **nueva terminal** y ejecuta:
```bash
stripe --version
```

Si ves la versión, está instalado correctamente.

---

## 🎯 Opción 3: Con Scoop

Si tienes Scoop instalado:

```bash
scoop install stripe
```

---

## ✅ Después de Instalar

Una vez instalado, sigue estos pasos:

### **1. Autenticarse**
```bash
stripe login
```

Esto abrirá tu navegador para autenticarte con Stripe.

### **2. Iniciar el Listener**
```bash
stripe listen --forward-to localhost:5290/api/webhooks/stripe
```

### **3. Copiar el Webhook Secret**
Stripe CLI mostrará:
```
> Ready! Your webhook signing secret is whsec_1234567890...
```

Copia ese secreto y pégalo en `backend/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890...
```

---

## 🧪 Probar

En otra terminal:
```bash
stripe trigger customer.subscription.created
```

Deberías ver el evento en la terminal donde está corriendo `stripe listen`.

