# 🚀 Configuración de Dominios - Proyecto MenuQR

Guía completa para configurar todos tus dominios y proyectos.

## 📦 Estructura de Proyectos

Tienes **3 proyectos separados**:

1. **Backend** (`backend/`) - API en Node.js/Express
2. **Frontend Administrador** (`frontend_administrador/`) - Panel de administración
3. **Frontend Cliente** (`frontend_cliente_react/`) - Menú QR para clientes

## 🌐 Dominios Configurados

Ya tienes configurados:
- ✅ `apimenusqr.site` → Backend API
- ✅ `menusqr.site` → Frontend Administrador
- ❓ `frontend_cliente` → Necesita dominio (ver opciones abajo)

## 🎯 Opciones de Despliegue

## 🎯 Configuración Actual

### Dominios Configurados:

```
apimenusqr.site        → Backend API ✅
menusqr.site           → Frontend Administrador ✅
```

### Configuración del Backend

**Variables de entorno (`.env`):**
```env
API_URL=https://apimenusqr.site/api
CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site
PORT=5290
```

### Configuración del Frontend Administrador

**Variables de entorno (`.env`):**
```env
VITE_API_URL=https://apimenusqr.site/api
VITE_WOMPI_PUBLIC_KEY=pub_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### URLs para Wompi

**1. URL de Eventos (Webhook):**
```
https://apimenusqr.site/api/webhooks/wompi
```

**2. Links de Pago - URL de Retorno:**
```
https://menusqr.site/planes?wompi_callback=true
```

## 📱 Frontend Cliente - Opciones de Dominio

El `frontend_cliente_react` es la aplicación que ven los clientes cuando escanean el QR del menú. Tienes varias opciones:

### Opción 1: Subdominio (Recomendado) ⭐

```
cliente.menusqr.site   → Frontend Cliente
```

**Ventajas:**
- ✅ Mantiene todo bajo el mismo dominio principal
- ✅ Fácil de recordar
- ✅ SEO mejorado

**Configuración:**

**Frontend Cliente `.env`:**
```env
VITE_API_URL=https://apimenusqr.site/api
```

**Backend `.env` - Actualizar CORS:**
```env
CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site
```

### Opción 2: Dominio Separado

Si prefieres un dominio completamente separado:

```
menuqr.club            → Frontend Cliente
menuqr.app             → Frontend Cliente
```

**Configuración:**

**Frontend Cliente `.env`:**
```env
VITE_API_URL=https://apimenusqr.site/api
```

**Backend `.env` - Actualizar CORS:**
```env
CORS_ORIGIN=https://menusqr.site,https://menuqr.club
```

### Opción 3: Subdirectorio (No recomendado)

Si quieres usar el mismo dominio con rutas:

```
menusqr.site/          → Frontend Administrador
menusqr.site/menu/     → Frontend Cliente (via proxy)
```

**No recomendado** porque complica el routing y la configuración.

---

## 📋 Resumen de URLs Completas

### Backend
- **API Base**: `https://apimenusqr.site/api`
- **Webhook Wompi**: `https://apimenusqr.site/api/webhooks/wompi`
- **Webhook Stripe**: `https://apimenusqr.site/api/webhooks/stripe`

### Frontend Administrador
- **URL Principal**: `https://menusqr.site`
- **Página de Planes**: `https://menusqr.site/planes`
- **Callback Wompi**: `https://menusqr.site/planes?wompi_callback=true`

### Frontend Cliente (según opción elegida)
- **Opción Subdominio**: `https://cliente.menusqr.site`
- **Opción Dominio Separado**: `https://menuqr.club` (o el que elijas)

---

## 🔧 Configuración Completa del Backend

Actualiza tu `.env` del backend para incluir todos los dominios:

```env
# API
API_URL=https://apimenusqr.site/api

# CORS - Incluir todos los frontends
CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site

# O si usas dominio separado para cliente:
# CORS_ORIGIN=https://menusqr.site,https://menuqr.club

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

---

## 🔧 Configuración del Frontend Cliente

**Variables de entorno (`.env`):**
```env
VITE_API_URL=https://apimenusqr.site/api
```

**Nota**: El frontend cliente NO necesita las keys de Wompi o Stripe porque no maneja pagos directamente.

---

### Opción 2: Proxy Reverso (Mismo Dominio)

Si prefieres usar un solo dominio:

```
menusqr.site/          → Frontend Administrador
menusqr.site/api/      → Backend API (via proxy)
```

#### Configuración con Nginx

**1. Instalar y configurar Nginx:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name menusqr.site;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name menusqr.site;

    # Certificado SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/menusqr.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/menusqr.site/privkey.pem;

    # Root para el frontend
    root /var/www/menusqr-site/frontend/dist;
    index index.html;

    # Frontend - Servir archivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API - Proxy reverso
    location /api/ {
        proxy_pass http://localhost:5290;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSockets (si usas WebSockets)
    location /socket.io/ {
        proxy_pass http://localhost:5290;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**2. Backend:**
- Corre en el mismo servidor en puerto 5290
- Variables de entorno:
  ```env
  API_URL=https://menusqr.site/api
  CORS_ORIGIN=https://menusqr.site
  PORT=5290
  ```

**3. Frontend:**
- Build y coloca los archivos en `/var/www/menusqr-site/frontend/dist`
- Variables de entorno:
  ```env
  VITE_API_URL=https://menusqr.site/api
  ```

**4. Wompi - URL de Eventos:**
```
https://menusqr.site/api/webhooks/wompi
```

**5. Wompi - Links de Pago:**
```
https://menusqr.site/planes?wompi_callback=true
```

#### Comandos útiles para Nginx

```bash
# Probar configuración
sudo nginx -t

# Recargar configuración
sudo systemctl reload nginx

# Ver logs
sudo tail -f /var/log/nginx/error.log
```

#### Ventajas
- ✅ Un solo dominio
- ✅ No necesitas configurar subdominio
- ✅ Útil si tienes limitaciones con DNS

---

## 📝 Resumen de URLs según la Opción

### Opción 1: Subdominio

| Servicio | URL |
|----------|-----|
| Frontend | `https://menusqr.site` |
| Backend API | `https://api.menusqr.site/api` |
| Webhook Wompi | `https://api.menusqr.site/api/webhooks/wompi` |
| Callback Wompi | `https://menusqr.site/planes?wompi_callback=true` |

### Opción 2: Proxy Reverso

| Servicio | URL |
|----------|-----|
| Frontend | `https://menusqr.site` |
| Backend API | `https://menusqr.site/api` |
| Webhook Wompi | `https://menusqr.site/api/webhooks/wompi` |
| Callback Wompi | `https://menusqr.site/planes?wompi_callback=true` |

---

## 🔒 SSL/HTTPS

**IMPORTANTE**: En ambos casos, necesitas certificado SSL válido:

### Con Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d menusqr.site
# Si usas subdominio:
sudo certbot --nginx -d menusqr.site -d api.menusqr.site

# Renovación automática
sudo certbot renew --dry-run
```

---

## ✅ Checklist de Despliegue

### Opción Subdominio:
- [ ] Backend desplegado y accesible en `api.menusqr.site`
- [ ] Frontend desplegado y accesible en `menusqr.site`
- [ ] SSL configurado en ambos dominios
- [ ] Variables de entorno configuradas correctamente
- [ ] CORS configurado en backend
- [ ] Webhook de Wompi configurado: `https://api.menusqr.site/api/webhooks/wompi`
- [ ] Links de pago con callback: `https://menusqr.site/planes?wompi_callback=true`

### Opción Proxy Reverso:
- [ ] Nginx instalado y configurado
- [ ] SSL configurado (Let's Encrypt)
- [ ] Backend corriendo en puerto 5290
- [ ] Frontend build y en `/var/www/menusqr-site/frontend/dist`
- [ ] Proxy configurado correctamente
- [ ] Variables de entorno configuradas
- [ ] Webhook de Wompi configurado: `https://menusqr.site/api/webhooks/wompi`
- [ ] Links de pago con callback: `https://menusqr.site/planes?wompi_callback=true`

---

## 🧪 Probar el Despliegue

### Verificar Backend:
```bash
curl https://api.menusqr.site/api/health
# O si usas proxy:
curl https://menusqr.site/api/health
```

### Verificar Frontend:
```bash
curl https://menusqr.site
```

### Verificar Webhook:
```bash
curl -X POST https://api.menusqr.site/api/webhooks/wompi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 💡 Recomendación

Para proyectos separados, **recomiendo la Opción 1 (Subdominio)** porque:
- Es más profesional y escalable
- Facilita el mantenimiento
- Permite mover servicios independientemente
- Es el estándar en la industria

