# Configuración de Variables de Entorno

## 📝 Configurar tu archivo .env

Crea un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
# ============================================
# CONFIGURACION DE BASE DE DATOS (REQUERIDAS)
# ============================================
DB_HOST=mssql-188335-0.cloudclusters.net
DB_PORT=13026
DB_USERNAME=andres
DB_PASSWORD=Soypipe23@
DB_DATABASE=MenuQR

# Configuración de encriptación (REQUERIDO para servidores en la nube)
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true

# Pool de conexiones
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=30000
DB_REQUEST_TIMEOUT=30000

# ============================================
# CONFIGURACION DEL SERVIDOR
# ============================================
NODE_ENV=development
PORT=5290
API_URL=http://localhost:5290/api

# ============================================
# JWT (Autenticación)
# ============================================
JWT_SECRET=tu_jwt_secret_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro_cambiar_en_produccion
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# REDIS (Opcional)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ============================================
# CLOUD STORAGE / IMAGENES
# ============================================
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ============================================
# STRIPE (Pagos)
# ============================================
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# EMAIL (SendGrid SMTP o Gmail SMTP)
# ============================================
# Opción 1: SendGrid (Recomendado)
EMAIL_PROVIDER=sendgrid
SENDGRID_SMTP_HOST=smtp.sendgrid.net
SENDGRID_SMTP_PORT=587
SENDGRID_SMTP_SECURE=false
SENDGRID_SMTP_USER=apikey
SENDGRID_SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=MenuQR <noreply@qrestaurante.site>
APP_NAME=MenuQR

# Opción 2: Gmail (Alternativa)
# EMAIL_PROVIDER=gmail
# GMAIL_USER=tu-email@gmail.com
# GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
# EMAIL_FROM=MenuQR <tu-email@gmail.com>
# APP_NAME=MenuQR

# ============================================
# CORS
# ============================================
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info
DB_LOGGING=false
DB_TIMEZONE=UTC
```

## ⚠️ Importante

1. **DB_ENCRYPT=true** - Debe estar en `true` porque tu servidor en la nube lo requiere
2. **DB_TRUST_CERTIFICATE=true** - Necesario para servidores en la nube
3. **DB_DATABASE=MenuQR** - Asegúrate de que la base de datos `MenuQR` exista en tu servidor

## 🔧 Verificar configuración

Después de crear el `.env`, ejecuta:

```bash
bun run test:db
```

Esto probará la conexión y te dirá si hay algún problema.

