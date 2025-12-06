# 🌐 Configuración de Dominio - menusqr.site

Esta guía explica cómo configurar tu dominio `menusqr.site` para que funcione correctamente con Wompi y el resto de la aplicación.

## 📋 URLs Importantes - Configuración Actual

### Dominios Configurados:

**Backend:**
- **API Base**: `https://apimenusqr.site/api`
- **Webhook de Wompi**: `https://apimenusqr.site/api/webhooks/wompi`
- **Webhook de Stripe**: `https://apimenusqr.site/api/webhooks/stripe`

**Frontend Administrador:**
- **URL Principal**: `https://menusqr.site`
- **Página de Planes**: `https://menusqr.site/planes`
- **Callback Wompi**: `https://menusqr.site/planes?wompi_callback=true`

**Frontend Cliente:**
- **URL**: Depende de la opción que elijas (ver sección "Frontend Cliente" abajo)

## 🔧 Configuración en Wompi

### 1. URL de Eventos (Webhook)

Con tu configuración actual:
```
https://apimenusqr.site/api/webhooks/wompi
```

### 2. URLs de Retorno en Links de Pago

La URL de retorno siempre va al frontend administrador:

```
https://menusqr.site/planes?wompi_callback=true
```

**Nota**: El retorno siempre va al frontend, no al backend, porque es donde el usuario ve la confirmación.

## 🔧 Configuración en Variables de Entorno

### Frontend (.env)

```env
VITE_API_URL=https://menusqr.site/api
VITE_WOMPI_PUBLIC_KEY=pub_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Backend (.env)

```env
API_URL=https://apimenusqr.site/api
CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site
# O si usas dominio separado para cliente:
# CORS_ORIGIN=https://menusqr.site,https://menuqr.club
```

**Nota**: Agrega todos los dominios de tus frontends separados por comas.

# Wompi
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_EVENTS_SECRET=events_secret_...
WOMPI_INTEGRITY_SECRET=integrity_secret_...
WOMPI_ENVIRONMENT=production

# Wompi Payment Links
WOMPI_PAYMENT_LINK_PRO_MONTHLY=https://checkout.wompi.co/.../pro-monthly
WOMPI_PAYMENT_LINK_PRO_ANNUAL=https://checkout.wompi.co/.../pro-annual
WOMPI_PAYMENT_LINK_PREMIUM_MONTHLY=https://checkout.wompi.co/.../premium-monthly
WOMPI_PAYMENT_LINK_PREMIUM_ANNUAL=https://checkout.wompi.co/.../premium-annual

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## ✅ Verificaciones Necesarias

### 1. Certificado SSL

Asegúrate de que tu dominio tenga un certificado SSL válido (HTTPS). Esto es **obligatorio** para:
- Wompi pueda enviar webhooks de forma segura
- Los usuarios puedan pagar de forma segura
- Cumplir con los requisitos de seguridad

### 2. Accesibilidad del Backend

Verifica que tu backend sea accesible públicamente:

```bash
curl https://menusqr.site/api/health
```

Deberías recibir una respuesta JSON con `{ "status": "ok" }`

### 3. Accesibilidad del Webhook

Verifica que el endpoint del webhook esté accesible:

```bash
curl -X POST https://menusqr.site/api/webhooks/wompi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 4. CORS Configurado

Asegúrate de que CORS esté configurado para permitir:
- Peticiones desde `https://menusqr.site`
- Peticiones de Wompi (si Wompi las requiere)

En el backend, verifica que `CORS_ORIGIN` incluya tu dominio:
```env
CORS_ORIGIN=https://menusqr.site
```

## 🚀 Despliegue - Opciones para Proyectos Separados

Como tienes dos proyectos separados (backend y frontend_administrador), tienes varias opciones:

### Opción 1: Subdominio para Backend (Recomendado) ⭐

Esta es la opción más común y recomendada:

```
menusqr.site              → Frontend Administrador
api.menusqr.site          → Backend API
```

**Ventajas:**
- ✅ Separación clara de responsabilidades
- ✅ Más fácil de configurar CORS
- ✅ Escalabilidad (puedes mover el backend a otro servidor fácilmente)
- ✅ Mejor para producción

**Configuración:**

1. **Backend** - Configura tu servidor en `api.menusqr.site`
2. **Frontend** - Actualiza `.env`:
   ```env
   VITE_API_URL=https://api.menusqr.site/api
   ```
3. **Webhook Wompi** - URL a configurar:
   ```
   https://api.menusqr.site/api/webhooks/wompi
   ```
4. **Links de Pago Wompi** - URL de retorno:
   ```
   https://menusqr.site/planes?wompi_callback=true
   ```

### Opción 2: Backend en ruta del mismo dominio (Proxy Reverso)

Si prefieres usar el mismo dominio con rutas diferentes:

```
menusqr.site/          → Frontend Administrador
menusqr.site/api/      → Backend API (via proxy)
```

**Ventajas:**
- ✅ Un solo dominio
- ✅ No necesitas configurar subdominio
- ✅ Útil si tienes limitaciones con subdominios

**Configuración:**

1. **Backend** - Corre en un puerto (ej: 5290)
2. **Frontend** - Configura proxy reverso (nginx, Cloudflare, etc.) que:
   - Sirve el frontend en `/`
   - Redirige `/api/*` al backend en puerto 5290
3. **Frontend** - `.env`:
   ```env
   VITE_API_URL=https://menusqr.site/api
   ```
4. **Webhook Wompi**:
   ```
   https://menusqr.site/api/webhooks/wompi
   ```

**Ejemplo de configuración Nginx:**
```nginx
server {
    listen 443 ssl;
    server_name menusqr.site;

    # Frontend
    location / {
        root /ruta/al/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5290;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opción 3: Puertos diferentes (Solo desarrollo local)

Para desarrollo local, puedes usar:

```
localhost:5173        → Frontend (Vite dev server)
localhost:5290        → Backend
```

**No recomendado para producción** ya que expone puertos directamente.

## 🔒 Seguridad

1. **HTTPS obligatorio**: Todos los endpoints deben usar HTTPS
2. **Verificación de webhooks**: Los webhooks de Wompi verifican la firma usando `WOMPI_EVENTS_SECRET`
3. **CORS restringido**: Solo permite tu dominio en producción
4. **Variables de entorno**: Nunca commits credenciales al repositorio

## 📝 Checklist de Configuración

- [ ] Certificado SSL configurado y funcionando
- [ ] Backend accesible en `https://menusqr.site/api`
- [ ] Frontend accesible en `https://menusqr.site`
- [ ] Webhook de Wompi configurado: `https://menusqr.site/api/webhooks/wompi`
- [ ] URLs de retorno en links de pago: `https://menusqr.site/planes?wompi_callback=true`
- [ ] Variables de entorno configuradas correctamente
- [ ] CORS configurado para permitir tu dominio
- [ ] Probado un pago de prueba completo

## 🧪 Probar Todo

1. Realiza un pago de prueba usando un link de Wompi
2. Verifica que te redirija correctamente a `https://menusqr.site/planes?wompi_callback=true`
3. Verifica que la suscripción se active automáticamente
4. Revisa los logs del backend para confirmar que recibiste el webhook

