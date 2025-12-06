# Verificación de Configuración .env

## ✅ Variables Requeridas para tu Servidor en la Nube

Asegúrate de que tu archivo `.env` tenga estas variables configuradas:

### Variables Obligatorias de Base de Datos:
```env
DB_HOST=mssql-188335-0.cloudclusters.net
DB_PORT=13026
DB_USERNAME=andres
DB_PASSWORD=Soypipe23@
DB_DATABASE=MenuQR

# ⚠️ IMPORTANTE: Estas dos líneas son CRÍTICAS para servidores en la nube
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true
```

### Otras Variables Importantes:
```env
NODE_ENV=development
PORT=5290
API_URL=http://localhost:5290/api
```

## 🔍 Verificar que todo esté correcto

Si tu servidor sigue dando el error de encriptación, verifica:

1. **Que DB_ENCRYPT esté en `true`** (no `false`, no comentado, no vacío)
2. **Que DB_TRUST_CERTIFICATE esté en `true`**

### Formato correcto:
```env
DB_ENCRYPT=true          ✅ Correcto
DB_ENCRYPT=true          ✅ Correcto (con espacios)
DB_ENCRYPT = true        ✅ Correcto
# DB_ENCRYPT=false       ❌ Incorrecto (comentado)
DB_ENCRYPT=false         ❌ Incorrecto
```

## 🧪 Probar la configuración

Ejecuta el test de conexión:
```bash
cd backend
bun run test:db
```

Si ves el error de encriptación, agrega estas líneas explícitamente a tu `.env`:
```env
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true
```

