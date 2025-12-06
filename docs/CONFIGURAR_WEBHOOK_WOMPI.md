# 🔗 Configurar Webhook de Wompi - Guía Paso a Paso

## 📋 ¿Por qué necesito configurar el Webhook?

El webhook (URL de eventos) es **NECESARIO** para que tu sistema:
- ✅ Reciba notificaciones automáticas cuando se complete un pago
- ✅ Active las suscripciones automáticamente
- ✅ Maneje pagos fallidos sin intervención manual
- ✅ Mantenga sincronizado el estado con Wompi

**Sin el webhook configurado, tendrías que consultar manualmente cada transacción.**

---

## 🎯 Pasos Detallados en el Panel de Wompi

### **Paso 1: Ir a Configuración Avanzada**

1. Inicia sesión en el [Panel de Wompi](https://comercios.wompi.co)
2. Ve a **Configuración** o **Configuración Avanzada**
3. Busca la sección **"Para Programadores"** o **"Desarrolladores"**
4. Busca **"Seguimiento de Transacciones"** o **"URL de Eventos"**

### **Paso 2: Agregar URL del Webhook**

La URL que debes configurar es:

```
https://menusqr.site/api/webhooks/wompi
```

**Nota**: Esta URL debe ser accesible desde internet para que Wompi pueda enviar eventos.

#### **Para Desarrollo Local:**

Si estás desarrollando localmente, necesitas una URL pública. Opciones:

**Opción A: Usar ngrok (Recomendado para desarrollo)**

1. Instala ngrok: https://ngrok.com/download
2. Inicia tu servidor backend:
   ```bash
   cd backend
   npm run dev
   ```
3. En otra terminal, inicia ngrok:
   ```bash
   ngrok http 5290
   ```
4. Copia la URL HTTPS que ngrok te da:
   ```
   Forwarding  https://abc123def456.ngrok.io -> http://localhost:5290
   ```
5. Usa esta URL en Wompi:
   ```
   https://abc123def456.ngrok.io/api/webhooks/wompi
   ```

**⚠️ Nota**: La URL de ngrok cambia cada vez que lo reinicias (a menos que tengas cuenta de pago). Para desarrollo esto está bien.

### **Paso 3: Seleccionar Eventos**

Selecciona los siguientes eventos que tu backend maneja:

- ✅ **`transaction.updated`** - Cuando se actualiza una transacción
- ✅ **`transaction.status_changed`** - Cuando cambia el estado (APPROVED, DECLINED, etc.)
- ✅ **`transaction.created`** - Cuando se crea una nueva transacción (opcional)

### **Paso 4: Guardar Configuración**

Guarda los cambios en el panel de Wompi.

---

## 🔐 Verificación de Seguridad

Tu backend ya está configurado para verificar la firma de los webhooks usando `WOMPI_EVENTS_SECRET`. Esto asegura que solo Wompi puede enviar eventos a tu sistema.

### Verificar que está funcionando:

1. **Revisa tus logs del backend** cuando recibas un evento
2. Deberías ver mensajes como:
   ```
   Webhook de Wompi: Transacción actualizada
   Webhook de Wompi: Pago registrado exitosamente
   ```
3. Si ves errores de "Firma inválida", verifica que `WOMPI_EVENTS_SECRET` esté correctamente configurado

---

## 🧪 Probar el Webhook

### Método 1: Pago de Prueba Real

1. Realiza un pago de prueba usando un link de pago
2. Completa el pago en Wompi
3. Verifica en los logs que recibiste el evento
4. Verifica que la suscripción se activó en tu base de datos

### Método 2: Usar el Panel de Wompi

Algunos paneles de Wompi permiten enviar eventos de prueba. Busca la opción "Enviar evento de prueba" o "Test Webhook".

---

## ⚠️ Problemas Comunes

### "Webhook Error: Missing signature"

- **Solución**: Asegúrate de que `WOMPI_EVENTS_SECRET` esté configurado en tu `.env`

### "Webhook Error: Invalid signature"

- **Solución**: Verifica que el `WOMPI_EVENTS_SECRET` en tu `.env` coincida con el "Secreto de Eventos" en el panel de Wompi

### "No recibo eventos"

- **Verifica**:
  1. La URL del webhook está correcta y es accesible públicamente
  2. Tu servidor backend está corriendo
  3. El endpoint `/api/webhooks/wompi` está registrado correctamente
  4. No hay firewall bloqueando las peticiones de Wompi

### Eventos no se procesan

- **Verifica**:
  1. Los logs del backend para ver errores
  2. Que los nombres de los eventos coincidan (`transaction.updated`, etc.)
  3. Que la base de datos esté accesible

---

## 📝 Resumen

**Configuración mínima necesaria:**

1. ✅ URL de eventos: `https://menusqr.site/api/webhooks/wompi`
2. ✅ Eventos seleccionados: `transaction.updated`, `transaction.status_changed`
3. ✅ Variable de entorno: `WOMPI_EVENTS_SECRET` configurado

**Una vez configurado, tu sistema recibirá notificaciones automáticas de Wompi y las suscripciones se activarán automáticamente.** 🎉

---

## 📌 URLs para tu Dominio (menusqr.site)

Con tu dominio configurado, estas son las URLs que debes usar:

### **URL de Eventos (Webhook) en Wompi:**
```
https://menusqr.site/api/webhooks/wompi
```

### **URL de Retorno en Links de Pago:**
```
https://menusqr.site/planes?wompi_callback=true
```

### **Importante:**
- Asegúrate de que tu backend esté desplegado y accesible públicamente
- El certificado SSL (HTTPS) debe estar activo y válido
- Verifica que el endpoint del webhook responda correctamente

