# 📱 Configuración del Frontend Cliente

El `frontend_cliente_react` es la aplicación que ven los clientes cuando escanean el QR del menú del restaurante.

## 🎯 ¿Qué es el Frontend Cliente?

Es la aplicación pública que permite a los clientes:
- Ver el menú del restaurante
- Hacer pedidos desde su mesa
- Ver el estado de sus pedidos
- Acceder mediante QR code o link directo

## 🌐 Opciones de Dominio

### Opción 1: Subdominio (Recomendado) ⭐

```
cliente.menusqr.site   → Frontend Cliente
```

**Ventajas:**
- ✅ Mantiene todo bajo el mismo dominio principal
- ✅ Fácil de recordar
- ✅ SEO mejorado
- ✅ Gratis (no necesitas comprar otro dominio)

**Configuración:**

1. **Crear subdominio en tu proveedor DNS:**
   - Tipo: CNAME
   - Nombre: `cliente`
   - Valor: `menusqr.site` (o la IP de tu servidor)

2. **Frontend Cliente `.env`:**
   ```env
   VITE_API_URL=https://apimenusqr.site/api
   ```

3. **Backend `.env` - Actualizar CORS:**
   ```env
   CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site
   ```

4. **Desplegar el frontend cliente** en el subdominio

---

### Opción 2: Dominio Separado

Si prefieres un dominio completamente separado:

```
menuqr.club            → Frontend Cliente
menuqr.app             → Frontend Cliente
menuqr.io              → Frontend Cliente
```

**Ventajas:**
- ✅ Separación completa
- ✅ Puede ser más corto y memorable
- ✅ Útil si quieres branding diferente

**Desventajas:**
- ❌ Necesitas comprar otro dominio
- ❌ Más costoso

**Configuración:**

1. **Comprar y configurar el dominio**

2. **Frontend Cliente `.env`:**
   ```env
   VITE_API_URL=https://apimenusqr.site/api
   ```

3. **Backend `.env` - Actualizar CORS:**
   ```env
   CORS_ORIGIN=https://menusqr.site,https://menuqr.club
   ```

4. **Desplegar el frontend cliente** en el nuevo dominio

---

### Opción 3: Usar el mismo dominio (No recomendado)

```
menusqr.site/          → Frontend Administrador
menusqr.site/menu/     → Frontend Cliente (via proxy)
```

**No recomendado** porque:
- ❌ Complica el routing
- ❌ Mezcla dos aplicaciones diferentes
- ❌ Más difícil de mantener

---

## 🔧 Configuración Completa

### Frontend Cliente - Variables de Entorno

Crea un archivo `.env` en `frontend_cliente_react/`:

```env
# API del Backend
VITE_API_URL=https://apimenusqr.site/api
```

**Nota**: El frontend cliente NO necesita:
- ❌ Keys de Wompi (no maneja pagos)
- ❌ Keys de Stripe (no maneja pagos)
- ❌ Tokens de autenticación (es público)

### Backend - Actualizar CORS

En tu `.env` del backend, asegúrate de incluir el dominio del frontend cliente:

```env
# CORS - Incluir todos los frontends
CORS_ORIGIN=https://menusqr.site,https://cliente.menusqr.site
```

O si usas dominio separado:
```env
CORS_ORIGIN=https://menusqr.site,https://menuqr.club
```

### Backend - Variable FRONTEND_CLIENTE_URL

El backend usa esta variable para generar URLs de QR. Actualiza en `.env`:

```env
# URL del frontend cliente (para generar QR codes)
FRONTEND_CLIENTE_URL=https://cliente.menusqr.site
# O si usas dominio separado:
# FRONTEND_CLIENTE_URL=https://menuqr.club
```

---

## 📋 Resumen de URLs

### Configuración Actual:

| Proyecto | Dominio | URL |
|----------|--------|-----|
| Backend | `apimenusqr.site` | `https://apimenusqr.site/api` |
| Frontend Admin | `menusqr.site` | `https://menusqr.site` |
| Frontend Cliente | `cliente.menusqr.site` | `https://cliente.menusqr.site` |

### URLs de Ejemplo para Clientes:

Cuando un cliente escanea el QR de una mesa, será redirigido a:
```
https://cliente.menusqr.site/{restaurante-slug}/m/{mesa-id}
```

Ejemplo:
```
https://cliente.menusqr.site/mi-restaurante/m/123
```

---

## ✅ Checklist de Configuración

- [ ] Decidir dominio para frontend cliente (subdominio o dominio separado)
- [ ] Configurar DNS (CNAME o A record)
- [ ] Crear `.env` en `frontend_cliente_react/` con `VITE_API_URL`
- [ ] Actualizar `CORS_ORIGIN` en backend para incluir el nuevo dominio
- [ ] Actualizar `FRONTEND_CLIENTE_URL` en backend
- [ ] Desplegar frontend cliente
- [ ] Configurar SSL/HTTPS para el nuevo dominio
- [ ] Probar acceso desde un QR code

---

## 🧪 Probar la Configuración

1. **Verificar que el frontend cliente carga:**
   ```bash
   curl https://cliente.menusqr.site
   ```

2. **Verificar que puede acceder al API:**
   - Abre el frontend cliente en el navegador
   - Abre la consola del navegador
   - Debería poder hacer peticiones a `https://apimenusqr.site/api`

3. **Probar con un QR code:**
   - Genera un QR code para una mesa
   - Escanéalo
   - Debería redirigir correctamente al frontend cliente

---

## 💡 Recomendación

**Recomiendo usar `cliente.menusqr.site` (subdominio)** porque:
- ✅ Es gratis
- ✅ Mantiene todo bajo el mismo dominio
- ✅ Más fácil de recordar
- ✅ Mejor para SEO
- ✅ Más profesional

