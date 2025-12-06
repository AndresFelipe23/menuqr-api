# 🚀 Usar Stripe CLI - Guía Rápida

## 📍 Paso 1: Encontrar dónde está stripe.exe

El archivo `stripe.exe` está en la carpeta donde lo descargaste/extrajiste.

**Ubicaciones comunes:**
- `C:\Users\57315\Downloads\stripe.exe`
- `C:\stripe-cli\stripe.exe`
- O donde lo hayas extraído

---

## 🔐 Paso 2: Autenticarse

Abre una terminal y navega a la carpeta donde está `stripe.exe`, luego ejecuta:

```bash
# Ejemplo si está en Downloads:
cd C:\Users\57315\Downloads
.\stripe.exe login

# O si está en otra carpeta, usa la ruta completa:
C:\ruta\a\tu\carpeta\stripe.exe login
```

Esto abrirá tu navegador para autenticarte con Stripe.

---

## 🎯 Paso 3: Iniciar el Listener

Necesitas **2 terminales abiertas**:

### **Terminal 1: Backend**
```bash
cd C:\Users\57315\Documents\ProyectoMenuQR\backend
npm run dev
```

### **Terminal 2: Stripe CLI**
```bash
# Navega a donde está stripe.exe
cd C:\Users\57315\Downloads  # (o donde lo tengas)

# Ejecuta el listener
.\stripe.exe listen --forward-to localhost:5290/api/webhooks/stripe
```

**O usa la ruta completa:**
```bash
C:\Users\57315\Downloads\stripe.exe listen --forward-to localhost:5290/api/webhooks/stripe
```

---

## 📋 Paso 4: Copiar el Webhook Secret

Cuando ejecutes `stripe listen`, verás algo como:

```
> Ready! Your webhook signing secret is whsec_1234567890abcdefghijklmnopqrstuvwxyz...
> Press Ctrl+C to quit
```

**Copia ese secreto** (empieza con `whsec_`) y pégalo en `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz...
```

---

## ✅ Paso 5: Verificar que Funciona

En una **tercera terminal**, ejecuta:

```bash
# Navega a donde está stripe.exe
cd C:\Users\57315\Downloads  # (o donde lo tengas)

# Dispara un evento de prueba
.\stripe.exe trigger customer.subscription.created
```

Deberías ver:
- El evento en la terminal de Stripe CLI
- Logs en tu servidor backend
- El webhook procesado correctamente

---

## 💡 Tip: Crear un Alias (Opcional)

Para no tener que escribir la ruta completa cada vez, puedes:

1. **Crear un archivo batch** `stripe.bat` en una carpeta en tu PATH:
   ```batch
   @echo off
   C:\Users\57315\Downloads\stripe.exe %*
   ```

2. O **mover stripe.exe a una carpeta en PATH** como `C:\Windows\System32`

---

## 📝 Comandos Útiles

```bash
# Ver versión
.\stripe.exe --version

# Autenticarse
.\stripe.exe login

# Iniciar listener
.\stripe.exe listen --forward-to localhost:5290/api/webhooks/stripe

# Disparar evento de prueba
.\stripe.exe trigger customer.subscription.created
.\stripe.exe trigger invoice.payment_succeeded
.\stripe.exe trigger invoice.payment_failed
```

---

## ⚠️ Importante

- **Mantén Stripe CLI corriendo** mientras desarrollas
- **NO cierres la terminal** donde está corriendo `stripe listen`
- El webhook secret de Stripe CLI es **diferente** al del Dashboard
- Para desarrollo, usa el de Stripe CLI
- Para producción, necesitarás configurar el webhook en Dashboard

---

## 🆘 Si tienes problemas

### **"stripe.exe no se reconoce"**
- Usa la ruta completa: `C:\ruta\completa\stripe.exe`
- O navega a la carpeta primero: `cd C:\ruta\a\stripe.exe`

### **"Please run 'stripe login' first"**
```bash
.\stripe.exe login
```

### **"Connection refused"**
- Verifica que tu backend esté corriendo en puerto 5290
- Verifica que la URL sea correcta: `localhost:5290/api/webhooks/stripe`

