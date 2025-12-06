# 🚀 Preparar Backend para Producción

Guía completa para preparar y desplegar el backend en producción.

## 📋 Checklist Pre-Despliegue

### 1. Variables de Entorno ✅

- [ ] Copiar `.env.production.example` a `.env`
- [ ] Completar todas las variables de entorno con valores reales
- [ ] Verificar que TODAS las credenciales sean de PRODUCCIÓN (no test)
- [ ] Generar nuevos secrets para JWT (nunca usar los de desarrollo)
- [ ] Verificar que CORS_ORIGIN incluya todos los dominios de producción

### 2. Base de Datos ✅

- [ ] Verificar conexión a la base de datos de producción
- [ ] Ejecutar migraciones si es necesario
- [ ] Verificar que `DB_ENCRYPT=true` y `DB_TRUST_CERTIFICATE=true`
- [ ] Probar conexión con: `npm run test:db`

### 3. Seguridad ✅

- [ ] Cambiar todos los secrets JWT (nunca usar los de desarrollo)
- [ ] Verificar que `NODE_ENV=production`
- [ ] Revisar configuración de CORS (solo dominios permitidos)
- [ ] Verificar que Helmet esté activo
- [ ] Revisar rate limiting si está configurado

### 4. Pasarelas de Pago ✅

- [ ] **Stripe**: Cambiar a credenciales de producción (`sk_live_...`)
- [ ] **Stripe**: Configurar webhook en producción: `https://apimenusqr.site/api/webhooks/stripe`
- [ ] **Wompi**: Cambiar a credenciales de producción (`pub_prod_...`)
- [ ] **Wompi**: Configurar webhook: `https://apimenusqr.site/api/webhooks/wompi`
- [ ] **Wompi**: Configurar `WOMPI_ENVIRONMENT=production`

### 5. Firebase Storage ✅

- [ ] Verificar credenciales de Firebase de producción
- [ ] Verificar que `firebase-service-account.json` sea de producción
- [ ] Verificar permisos del bucket de Firebase

### 6. Build y Compilación ✅

- [ ] Ejecutar `npm run build` para compilar TypeScript
- [ ] Verificar que no haya errores de compilación
- [ ] Verificar que la carpeta `dist/` se haya creado correctamente

---

## 🔧 Configuración de Variables de Entorno

### Paso 1: Copiar el archivo de ejemplo

```bash
cd backend
cp .env.production.example .env
```

### Paso 2: Completar las variables

Edita el archivo `.env` y completa con tus valores reales de producción.

### Variables Críticas:

#### Base de Datos
```env
DB_HOST=tu-servidor-sql.cloudclusters.net
DB_PORT=13026
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_password_seguro
DB_DATABASE=MenuQR
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true
```

#### API y Dominios
```env
NODE_ENV=production
API_URL=https://apimenusqr.site/api
CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site
FRONTEND_CLIENTE_URL=https://cliente.menusqr.site
```

#### JWT (GENERAR NUEVOS)
```env
# IMPORTANTE: Generar nuevos secrets en producción
# Usa un generador seguro: openssl rand -base64 32
JWT_SECRET=tu_jwt_secret_super_seguro_minimo_32_caracteres
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro_minimo_32_caracteres
```

#### Stripe (PRODUCCIÓN)
```env
STRIPE_SECRET_KEY=sk_live_...  # NO usar sk_test_
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...
```

#### Wompi (PRODUCCIÓN)
```env
WOMPI_PUBLIC_KEY=pub_prod_...  # NO usar pub_test_
WOMPI_PRIVATE_KEY=prv_prod_...
WOMPI_ENVIRONMENT=production
WOMPI_EVENTS_SECRET=events_secret_...
WOMPI_INTEGRITY_SECRET=integrity_secret_...
WOMPI_PAYMENT_LINK_PRO_MONTHLY=https://checkout.wompi.co/...
WOMPI_PAYMENT_LINK_PRO_ANNUAL=https://checkout.wompi.co/...
WOMPI_PAYMENT_LINK_PREMIUM_MONTHLY=https://checkout.wompi.co/...
WOMPI_PAYMENT_LINK_PREMIUM_ANNUAL=https://checkout.wompi.co/...
```

---

## 🔒 Generar Secrets Seguros

### Generar JWT Secrets

```bash
# Opción 1: Con OpenSSL (recomendado)
openssl rand -base64 32

# Opción 2: Con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Online (si confías)
# https://generate-secret.vercel.app/32
```

**Genera DOS secrets diferentes:**
- Uno para `JWT_SECRET`
- Otro para `JWT_REFRESH_SECRET`

---

## 📦 Build del Proyecto

### 1. Instalar dependencias

```bash
cd backend
npm install
# O si usas bun:
bun install
```

### 2. Compilar TypeScript

```bash
npm run build
```

Esto creará la carpeta `dist/` con el código JavaScript compilado.

### 3. Verificar build

```bash
# Verificar que dist/server.js existe
ls -la dist/server.js

# Verificar que no haya errores
npm run start
```

---

## 🧪 Verificaciones Antes de Desplegar

### 1. Probar Conexión a Base de Datos

```bash
npm run test:db
```

Deberías ver:
```
✅ Conexión exitosa a la base de datos
```

### 2. Probar Build Localmente

```bash
# Build
npm run build

# Iniciar
npm start
```

### 3. Verificar Endpoints Críticos

```bash
# Health check
curl https://apimenusqr.site/api/health

# Debería responder: {"status":"ok","timestamp":"...","environment":"production"}
```

### 4. Verificar Variables de Entorno

El servidor debería mostrar warnings si faltan variables importantes. Revisa los logs al iniciar.

---

## 🚀 Opciones de Despliegue

### Opción 1: VPS / Servidor Dedicado (Recomendado)

#### Con PM2 (Process Manager)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
pm2 start dist/server.js --name menuqr-backend

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup

# Ver logs
pm2 logs menuqr-backend

# Monitoreo
pm2 monit

# Reiniciar
pm2 restart menuqr-backend

# Detener
pm2 stop menuqr-backend
```

#### Con systemd (Alternativa)

Crear archivo `/etc/systemd/system/menuqr-backend.service`:

```ini
[Unit]
Description=MenuQR Backend API
After=network.target

[Service]
Type=simple
User=tu_usuario
WorkingDirectory=/ruta/al/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activar servicio:
```bash
sudo systemctl enable menuqr-backend
sudo systemctl start menuqr-backend
sudo systemctl status menuqr-backend
```

### Opción 2: Railway

1. Conectar repositorio a Railway
2. Configurar variables de entorno en el dashboard
3. Railway detectará automáticamente Node.js y ejecutará `npm start`

### Opción 3: Render

1. Crear nuevo Web Service
2. Conectar repositorio
3. Configurar:
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. Agregar variables de entorno

### Opción 4: Heroku

1. Crear aplicación Heroku
2. Configurar buildpacks: Node.js
3. Agregar variables de entorno
4. Deploy: `git push heroku main`

---

## 🔐 Configuración de Nginx (Si usas VPS)

Si desplegas en un VPS, probablemente necesites Nginx como reverse proxy.

### Configuración Nginx

```nginx
server {
    listen 80;
    server_name apimenusqr.site;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name apimenusqr.site;

    # Certificado SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/apimenusqr.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apimenusqr.site/privkey.pem;

    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/apimenusqr-access.log;
    error_log /var/log/nginx/apimenusqr-error.log;

    # Proxy al backend
    location / {
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

    # WebSockets
    location /socket.io/ {
        proxy_pass http://localhost:5290;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Obtener Certificado SSL

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d apimenusqr.site
```

---

## ✅ Post-Despliegue

### 1. Verificar Endpoints

```bash
# Health check
curl https://apimenusqr.site/api/health

# API Docs
curl https://apimenusqr.site/api/docs
```

### 2. Configurar Webhooks

#### Stripe Webhook
1. Ir a [Stripe Dashboard](https://dashboard.stripe.com) → Webhooks
2. Agregar endpoint: `https://apimenusqr.site/api/webhooks/stripe`
3. Seleccionar eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copiar el `Signing Secret` y agregarlo a `STRIPE_WEBHOOK_SECRET`

#### Wompi Webhook
1. Ir a [Wompi Panel](https://comercios.wompi.co) → Configuración → Programadores
2. Agregar URL de eventos: `https://apimenusqr.site/api/webhooks/wompi`
3. Seleccionar eventos:
   - `transaction.updated`
   - `transaction.status_changed`
4. Verificar que `WOMPI_EVENTS_SECRET` esté configurado

### 3. Monitoreo

- Configurar logs (PM2, systemd, o servicio de logging)
- Configurar alertas para errores
- Monitorear uso de recursos (CPU, memoria)

---

## 🔍 Troubleshooting

### Error: "Cannot find module"

```bash
# Asegúrate de que node_modules esté instalado
npm install --production
```

### Error de conexión a base de datos

- Verificar que `DB_ENCRYPT=true` y `DB_TRUST_CERTIFICATE=true`
- Verificar credenciales
- Verificar que el servidor permita conexiones externas

### Error de CORS

- Verificar que `CORS_ORIGIN` incluya el dominio correcto
- Verificar formato (separado por comas, sin espacios extra)

### Webhooks no funcionan

- Verificar que la URL sea accesible públicamente
- Verificar que el certificado SSL sea válido
- Verificar los secrets de webhooks

---

## 📝 Checklist Final

- [ ] Variables de entorno configuradas
- [ ] Build exitoso (`npm run build`)
- [ ] Conexión a base de datos verificada
- [ ] Secrets JWT generados nuevos
- [ ] Credenciales de producción (no test)
- [ ] Webhooks configurados
- [ ] SSL/HTTPS configurado
- [ ] Servidor desplegado y corriendo
- [ ] Health check responde correctamente
- [ ] Logs funcionando

---

## 🎯 Comandos Rápidos

```bash
# Build
npm run build

# Test DB
npm run test:db

# Start producción
npm start

# Con PM2
pm2 start dist/server.js --name menuqr-backend
pm2 logs menuqr-backend

# Verificar
curl https://apimenusqr.site/api/health
```

¡Tu backend está listo para producción! 🚀

