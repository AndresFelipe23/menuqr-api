# ✅ Checklist de Producción - Backend

Usa este checklist para asegurarte de que todo esté listo antes de desplegar.

## 🔧 Configuración

### Variables de Entorno
- [ ] Archivo `.env` creado desde `.env.production.example`
- [ ] `NODE_ENV=production` configurado
- [ ] `API_URL=https://apimenusqr.site/api` configurado
- [ ] Ejecutar `npm run verify:production` y corregir todos los errores

### Base de Datos
- [ ] Credenciales de base de datos de producción configuradas
- [ ] `DB_ENCRYPT=true` configurado
- [ ] `DB_TRUST_CERTIFICATE=true` configurado
- [ ] Conexión verificada con `npm run test:db`

### Seguridad
- [ ] `JWT_SECRET` generado nuevo (mínimo 32 caracteres)
- [ ] `JWT_REFRESH_SECRET` generado nuevo (mínimo 32 caracteres)
- [ ] `CORS_ORIGIN` configurado solo con dominios de producción
- [ ] Verificar que CORS no incluya localhost

### Pasarelas de Pago

#### Stripe
- [ ] `STRIPE_SECRET_KEY` es de producción (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado
- [ ] Price IDs configurados (PRO, PRO_ANNUAL, PREMIUM, PREMIUM_ANNUAL)
- [ ] Webhook configurado en Stripe Dashboard: `https://apimenusqr.site/api/webhooks/stripe`

#### Wompi
- [ ] `WOMPI_ENVIRONMENT=production` configurado
- [ ] `WOMPI_PUBLIC_KEY` es de producción (`pub_prod_...`)
- [ ] `WOMPI_PRIVATE_KEY` es de producción (`prv_prod_...`)
- [ ] `WOMPI_EVENTS_SECRET` configurado
- [ ] `WOMPI_INTEGRITY_SECRET` configurado
- [ ] Payment Links configurados (4 links: PRO mensual/anual, PREMIUM mensual/anual)
- [ ] Webhook configurado en Wompi: `https://apimenusqr.site/api/webhooks/wompi`

### Firebase
- [ ] `FIREBASE_PROJECT_ID` configurado
- [ ] Credenciales de Firebase configuradas
- [ ] `firebase-service-account.json` es de producción
- [ ] Permisos del bucket verificados

### URLs
- [ ] `FRONTEND_CLIENTE_URL` configurado con HTTPS
- [ ] Verificar que todas las URLs usen HTTPS

## 📦 Build y Compilación

- [ ] Dependencias instaladas: `npm install` o `bun install`
- [ ] Proyecto compilado: `npm run build`
- [ ] Verificar que `dist/` se creó correctamente
- [ ] Verificar que no haya errores de compilación

## 🧪 Verificaciones

- [ ] Script de verificación ejecutado: `npm run verify:production`
- [ ] Sin errores críticos
- [ ] Advertencias revisadas y corregidas si es necesario
- [ ] Conexión a base de datos probada
- [ ] Health check funciona: `curl https://apimenusqr.site/api/health`

## 🚀 Despliegue

- [ ] Servidor configurado (VPS, Railway, Render, etc.)
- [ ] Variables de entorno configuradas en el servidor
- [ ] Certificado SSL configurado y válido
- [ ] Servidor iniciado y corriendo
- [ ] Logs verificados (sin errores críticos)

## 🔗 Post-Despliegue

- [ ] Health check responde correctamente
- [ ] Webhooks configurados y probados
- [ ] Monitoreo configurado (logs, alertas)
- [ ] Documentación actualizada

## 📝 Notas

Después de completar este checklist, tu backend debería estar listo para producción.

Si encuentras algún problema, revisa la guía completa en `PREPARAR_PRODUCCION.md`.

