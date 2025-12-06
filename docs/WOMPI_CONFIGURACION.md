# Configuración de Wompi para Pagos

Esta guía explica cómo configurar Wompi como método de pago adicional en tu plataforma.

## 🔑 Credenciales de Wompi

Wompi proporciona las siguientes credenciales en su panel de desarrolladores:

### Llaves del API para integración técnica
- **Llave pública** (`WOMPI_PUBLIC_KEY`): Identifica tu comercio
- **Llave privada** (`WOMPI_PRIVATE_KEY`): Para operaciones seguras del servidor

### Secretos para integración técnica
- **Eventos** (`WOMPI_EVENTS_SECRET`): Secreto para verificar webhooks
- **Integridad** (`WOMPI_INTEGRITY_SECRET`): Secreto para verificar la integridad de las transacciones

## 📝 Variables de Entorno

Agrega estas variables a tu archivo `.env` del backend:

```env
# Wompi - Llaves del API
WOMPI_PUBLIC_KEY=pub_test_...  # Tu llave pública
WOMPI_PRIVATE_KEY=prv_test_...  # Tu llave privada

# Wompi - Secretos
WOMPI_EVENTS_SECRET=events_secret_...      # Secreto de eventos (para webhooks)
WOMPI_INTEGRITY_SECRET=integrity_secret_... # Secreto de integridad (para verificar transacciones)

# Wompi - Links de Pago (Payment Links)
# Estos son los links que creaste en el panel de Wompi para cada plan
WOMPI_PAYMENT_LINK_PRO_MONTHLY=https://checkout.wompi.co/.../pro-monthly
WOMPI_PAYMENT_LINK_PRO_ANNUAL=https://checkout.wompi.co/.../pro-annual
WOMPI_PAYMENT_LINK_PREMIUM_MONTHLY=https://checkout.wompi.co/.../premium-monthly
WOMPI_PAYMENT_LINK_PREMIUM_ANNUAL=https://checkout.wompi.co/.../premium-annual

# Wompi - Configuración
WOMPI_ENVIRONMENT=sandbox  # 'sandbox' para pruebas, 'production' para producción
WOMPI_MERCHANT_ID=merchant_...  # Opcional, según la versión de la API
```

### Frontend (.env)

```env
# Wompi - Llave pública (solo para el frontend)
VITE_WOMPI_PUBLIC_KEY=pub_test_...
```

## 🔐 Dónde Encontrar las Credenciales

1. Inicia sesión en el [Panel de Wompi](https://comercios.wompi.co)
2. Ve a **Desarrolladores** → **Credenciales**
3. Copia las siguientes credenciales:
   - **Llave pública**: Úsala en el frontend y para identificar tu comercio
   - **Llave privada**: Úsala solo en el backend, nunca la expongas al frontend
   - **Secreto de Eventos**: Para verificar webhooks
   - **Secreto de Integridad**: Para verificar la integridad de las respuestas

## 🔗 Crear Links de Pago en Wompi

Los links de pago son la forma más simple de integrar Wompi. Te permiten redirigir a los clientes a la página de pago de Wompi sin manejar tarjetas directamente.

### Pasos para crear los links:

1. En el panel de Wompi, ve a **Enlaces de Pago** o **Payment Links**
2. Crea 4 links de pago (uno para cada combinación):
   - **PRO Mensual**: Configura el monto en COP (ej: $36,000)
   - **PRO Anual**: Configura el monto en COP (ej: $360,000)
   - **PREMIUM Mensual**: Configura el monto en COP (ej: $56,000)
   - **PREMIUM Anual**: Configura el monto en COP (ej: $560,000)

3. **Importante**: Configura la **URL de retorno** (`redirect_url`) en cada link:
   ```
   https://menusqr.site/planes?wompi_callback=true
   ```
   
   Esta es la URL a la que Wompi redirigirá al usuario después de completar el pago.

4. Copia la URL de cada link y agrégalas a las variables de entorno del backend.

### Ventajas de usar Links de Pago:
- ✅ Más seguro (Wompi maneja toda la información de tarjetas)
- ✅ Más simple de implementar
- ✅ No necesitas manejar tokenización de tarjetas
- ✅ Wompi se encarga del cumplimiento PCI DSS

## 🌐 Configurar URL de Eventos (Webhooks)

**SÍ, es necesario configurar la URL de eventos** para que tu sistema reciba notificaciones automáticas cuando:
- Se complete un pago
- Falle un pago
- Cambie el estado de una transacción

### Pasos para configurar:

1. En el panel de Wompi, ve a **Configuración Avanzada** → **Programadores** o **Desarrolladores**
2. Busca la sección **"Seguimiento de Transacciones"** o **"URL de Eventos"**
3. Agrega la URL de tu webhook:

   **Producción:**
   ```
   https://menusqr.site/api/webhooks/wompi
   ```
   
   **Nota**: Asegúrate de que tu backend esté desplegado y accesible en este dominio.

   **Desarrollo local (con ngrok u otra herramienta):**
   ```
   https://tu-tunel-ngrok.ngrok.io/api/webhooks/wompi
   ```

4. **Eventos importantes a configurar:**
   - ✅ `transaction.updated` - Cuando se actualiza una transacción
   - ✅ `transaction.status_changed` - Cuando cambia el estado de una transacción
   - ✅ `transaction.created` - Cuando se crea una transacción (opcional)

### ¿Por qué es importante?

Sin la URL de eventos configurada:
- ❌ Tu sistema no sabrá automáticamente cuando se complete un pago
- ❌ Tendrías que consultar manualmente el estado de cada transacción
- ❌ Las suscripciones no se activarían automáticamente

Con la URL de eventos configurada:
- ✅ Tu sistema recibe notificaciones automáticas de Wompi
- ✅ Las suscripciones se activan inmediatamente al completarse el pago
- ✅ Puedes manejar pagos fallidos automáticamente
- ✅ Todo funciona en tiempo real sin intervención manual

### Verificar que funciona:

1. Configura la URL de eventos
2. Realiza un pago de prueba usando un link de pago
3. Verifica en los logs del backend que recibiste el evento:
   ```
   Webhook de Wompi: Transacción actualizada
   Webhook de Wompi: Pago registrado exitosamente
   ```

## 💰 Precios en COP

Los precios están configurados en `backend/src/config/wompi.config.ts`:

```typescript
export const WOMPI_PLAN_PRICES = {
  pro: {
    monthly: 36000,   // $9 USD * 4000 COP
    annual: 360000,   // $90 USD * 4000 COP
  },
  premium: {
    monthly: 56000,   // $14 USD * 4000 COP
    annual: 560000,   // $140 USD * 4000 COP
  },
};
```

**Nota**: Ajusta estos precios según la tasa de cambio actual USD/COP.

## ✅ Verificación

Para verificar que todo está configurado correctamente:

1. **Backend**: Verifica que las variables de entorno estén cargadas
2. **Frontend**: Verifica que `VITE_WOMPI_PUBLIC_KEY` esté disponible
3. **Webhooks**: Prueba enviando un evento de prueba desde el panel de Wompi

## 🚨 Seguridad

- **Nunca** expongas la llave privada en el frontend
- **Nunca** commits las credenciales al repositorio
- Usa variables de entorno para todas las credenciales
- En producción, usa credenciales de producción (no de sandbox)

## 📚 Documentación Oficial

- [Documentación de Wompi Colombia](https://docs.wompi.co/docs/colombia/)
- [API Reference](https://docs.wompi.co/docs/colombia/referencia-api/)

## 🔄 Testing

En modo sandbox, puedes usar tarjetas de prueba:
- **Aprobada**: 4242424242424242
- **Rechazada**: 4000000000000002

Consulta la documentación de Wompi para más tarjetas de prueba.

