# 📧 Configuración de Email - SendGrid / Gmail

Esta guía explica cómo configurar el servicio de email para enviar notificaciones de reservas usando **SendGrid SMTP** o **Gmail SMTP**. Esta solución **NO requiere configuración DNS compleja**, a diferencia de Resend.

## 🎯 ¿Por qué SendGrid o Gmail?

- ✅ **No requiere DNS**: No necesitas configurar registros SPF, DKIM, DMARC, MX
- ✅ **Fácil de configurar**: Solo necesitas credenciales SMTP
- ✅ **Funciona con CloudClusters**: Compatible con tu proveedor actual
- ✅ **Plan gratuito generoso**: SendGrid ofrece 100 emails/día gratis

## 📋 Opciones Disponibles

### Opción 1: SendGrid SMTP (Recomendado) ⭐

**Ventajas:**
- 100 emails/día gratis
- Mejor deliverability
- Ideal para producción
- No requiere verificación de dominio (puedes usar el remitente por defecto)

**Pasos:**

1. **Crear cuenta en SendGrid**
   - Ve a [sendgrid.com](https://sendgrid.com)
   - Crea una cuenta gratuita
   - Verifica tu email

2. **Crear API Key SMTP**
   - Ve a **Settings** → **API Keys**
   - Haz clic en **Create API Key**
   - Selecciona **Full Access** o **Restricted Access** (solo SMTP)
   - Copia la API Key generada

3. **Obtener credenciales SMTP**
   - Ve a **Settings** → **SMTP Relay**
   - Copia los siguientes valores:
     - **SMTP Host**: `smtp.sendgrid.net`
     - **SMTP Port**: `587` (o `465` para SSL)
     - **SMTP Username**: `apikey`
     - **SMTP Password**: Tu API Key (la que copiaste arriba)

4. **Configurar variables de entorno**

   Agrega al archivo `.env` del backend:

   ```env
   # ============================================
   # EMAIL (SendGrid SMTP)
   # ============================================
   EMAIL_PROVIDER=sendgrid
   SENDGRID_SMTP_HOST=smtp.sendgrid.net
   SENDGRID_SMTP_PORT=587
   SENDGRID_SMTP_SECURE=false
   SENDGRID_SMTP_USER=apikey
   SENDGRID_SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=MenuQR <noreply@qrestaurante.site>
   APP_NAME=MenuQR
   ```

   **Nota**: Reemplaza `SG.xxxxxxxx...` con tu API Key real de SendGrid.

---

### Opción 2: Gmail SMTP

**Ventajas:**
- Gratis
- Fácil de configurar
- No requiere cuenta adicional

**Desventajas:**
- Límite de 500 emails/día
- Puede ir a spam si envías muchos emails
- Requiere "Contraseña de aplicación" (no tu contraseña normal)

**Pasos:**

1. **Habilitar verificación en 2 pasos**
   - Ve a tu cuenta de Google: [myaccount.google.com](https://myaccount.google.com)
   - Ve a **Seguridad** → **Verificación en 2 pasos**
   - Actívala si no está activa

2. **Generar contraseña de aplicación**
   - Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Selecciona **Correo** y **Otro (nombre personalizado)**
   - Ingresa "MenuQR" como nombre
   - Copia la contraseña generada (16 caracteres sin espacios)

3. **Configurar variables de entorno**

   Agrega al archivo `.env` del backend:

   ```env
   # ============================================
   # EMAIL (Gmail SMTP)
   # ============================================
   EMAIL_PROVIDER=gmail
   GMAIL_USER=tu-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   EMAIL_FROM=MenuQR <tu-email@gmail.com>
   APP_NAME=MenuQR
   ```

   **Nota**: 
   - `GMAIL_USER`: Tu email de Gmail completo
   - `GMAIL_APP_PASSWORD`: La contraseña de aplicación de 16 caracteres (puedes incluir o no los espacios)

---

## ✅ Verificación

Una vez configurado, reinicia el servidor. Deberías ver en los logs:

```
✅ Servicio de email inicializado correctamente
```

Si ves una advertencia, revisa que todas las variables de entorno estén configuradas correctamente.

## 📧 Emails que se Envían

El sistema envía automáticamente:

1. **Email de confirmación al cliente** cuando se confirma una reserva
   - Incluye: fecha, hora, mesa, código de confirmación, número de personas

2. **Email de notificación al restaurante** cuando se crea una nueva reserva
   - Incluye: datos del cliente, fecha, hora, mesa, notas especiales

## 🔧 Solución de Problemas

### Error: "Servicio de email no configurado"

**Causa**: Faltan variables de entorno o están incorrectas.

**Solución**:
1. Verifica que todas las variables estén en el `.env`
2. Reinicia el servidor después de agregar las variables
3. Revisa que no haya espacios extra en las variables

### Error: "Invalid login" (SendGrid)

**Causa**: API Key incorrecta o usuario SMTP incorrecto.

**Solución**:
- Verifica que `SENDGRID_SMTP_USER=apikey` (literalmente "apikey")
- Verifica que `SENDGRID_SMTP_PASS` sea tu API Key completa (empieza con `SG.`)

### Error: "Invalid login" (Gmail)

**Causa**: Contraseña de aplicación incorrecta o verificación en 2 pasos desactivada.

**Solución**:
- Asegúrate de usar la **contraseña de aplicación**, no tu contraseña normal
- Verifica que la verificación en 2 pasos esté activa
- Genera una nueva contraseña de aplicación si es necesario

### Los emails no llegan

**Posibles causas**:
1. **Spam**: Revisa la carpeta de spam
2. **Configuración incorrecta**: Verifica las variables de entorno
3. **Límite alcanzado**: SendGrid (100/día gratis) o Gmail (500/día)

**Solución**:
- Revisa los logs del servidor para ver errores específicos
- Verifica que el email del destinatario sea válido
- Prueba enviando a tu propio email primero

## 📝 Variables de Entorno Completas

### Para SendGrid:
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_SMTP_HOST=smtp.sendgrid.net
SENDGRID_SMTP_PORT=587
SENDGRID_SMTP_SECURE=false
SENDGRID_SMTP_USER=apikey
SENDGRID_SMTP_PASS=SG.tu_api_key_aqui
EMAIL_FROM=MenuQR <noreply@qrestaurante.site>
APP_NAME=MenuQR
```

### Para Gmail:
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=tu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=MenuQR <tu-email@gmail.com>
APP_NAME=MenuQR
```

## 🚀 Próximos Pasos

1. Configura las variables de entorno según la opción elegida
2. Reinicia el servidor
3. Crea una reserva de prueba y confírmala
4. Verifica que los emails lleguen correctamente

---

**¿Necesitas ayuda?** Revisa los logs del servidor para ver mensajes de error específicos.

