# Configuración de Base de Datos - SQL Server

## 🔌 Configuración de Conexión

### Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del proyecto `backend/` con las siguientes variables:

```env
# Configuración básica
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=tu_password_aqui
DB_DATABASE=MenuQR
```

### Variables Opcionales

```env
# Para instancias nombradas de SQL Server
DB_INSTANCE=nombre_instancia

# Seguridad SSL/TLS
DB_ENCRYPT=false                    # true para producción
DB_TRUST_CERTIFICATE=true           # true para desarrollo local

# Logging
DB_LOGGING=false                    # true para ver queries SQL

# Timezone
DB_TIMEZONE=UTC

# Pool de conexiones
DB_POOL_MAX=10                      # Máximo de conexiones simultáneas
DB_POOL_MIN=0                       # Mínimo de conexiones
DB_POOL_IDLE_TIMEOUT=30000          # Timeout en milisegundos (30 seg)
DB_CONNECTION_TIMEOUT=30000         # Timeout de conexión (30 seg)
DB_REQUEST_TIMEOUT=30000            # Timeout de requests (30 seg)
```

## 🧪 Probar la Conexión

### Opción 1: Script de prueba

```bash
cd backend
bun run test:db
# o
npm run test:db
```

### Opción 2: Iniciar el servidor

El servidor verificará automáticamente la conexión al iniciar:

```bash
bun run dev
# o
npm run dev
```

## 🔧 Solución de Problemas

### Error: ECONNREFUSED

**Problema**: No se puede conectar al servidor SQL Server.

**Soluciones**:
1. Verifica que SQL Server esté corriendo:
   ```powershell
   # En PowerShell o CMD
   Get-Service MSSQLSERVER
   ```

2. Verifica que el puerto 1433 esté abierto:
   ```powershell
   Test-NetConnection localhost -Port 1433
   ```

3. Verifica la configuración en `.env`:
   - `DB_HOST` debe ser `localhost` o la IP del servidor
   - `DB_PORT` debe ser `1433` (puerto por defecto)

### Error: Login failed for user

**Problema**: Credenciales incorrectas.

**Soluciones**:
1. Verifica `DB_USERNAME` y `DB_PASSWORD` en `.env`
2. Asegúrate de que la autenticación SQL esté habilitada:
   - Abre SQL Server Management Studio
   - Propiedades del servidor → Seguridad
   - Modo de autenticación: "Autenticación de SQL Server y Windows"

3. Si usas Windows Authentication:
   ```env
   DB_USERNAME=
   DB_PASSWORD=
   ```
   Y modifica la configuración para usar autenticación integrada.

### Error: Cannot open database "MenuQR"

**Problema**: La base de datos no existe.

**Soluciones**:
1. Crea la base de datos:
   ```sql
   CREATE DATABASE MenuQR;
   ```

2. Ejecuta el script de esquema:
   ```bash
   # Desde SQL Server Management Studio
   # Abre database/schema.sql y ejecuta el script completo
   ```

3. Verifica el nombre de la base de datos en `.env`

### Error: Instance name not specified

**Problema**: Estás usando una instancia nombrada.

**Soluciones**:
1. Si tu SQL Server tiene una instancia nombrada (ej: `SQLEXPRESS`), agrega:
   ```env
   DB_INSTANCE=SQLEXPRESS
   ```

2. O usa el formato completo en `DB_HOST`:
   ```env
   DB_HOST=localhost\\SQLEXPRESS
   ```

### Para Instancias Nombradas (SQL Server Express)

Si usas SQL Server Express, generalmente viene con la instancia `SQLEXPRESS`:

```env
DB_HOST=localhost
DB_PORT=1433
DB_INSTANCE=SQLEXPRESS
# O alternativamente:
# DB_HOST=localhost\\SQLEXPRESS
```

## 📊 Verificar Tablas Creadas

Una vez conectado, puedes verificar que las tablas existan:

```sql
USE MenuQR;
GO

SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

Deberías ver todas las tablas del esquema:
- restaurantes
- usuarios
- roles
- mesas
- categorias
- items_menu
- pedidos
- etc.

## 🔐 Seguridad en Producción

Para producción, asegúrate de:

1. **Usar SSL/TLS**:
   ```env
   DB_ENCRYPT=true
   DB_TRUST_CERTIFICATE=false
   ```

2. **Credenciales seguras**: Usa un usuario dedicado con permisos mínimos necesarios

3. **Connection String seguro**: No commitees el archivo `.env` a Git

4. **Firewall**: Configura reglas de firewall apropiadas

## 📝 Notas Importantes

- **Synchronize**: Está deshabilitado (`false`). Siempre usa migraciones para cambios de esquema.
- **Pool de conexiones**: El pool se configura automáticamente según las variables de entorno.
- **Timeout**: Los timeouts por defecto son 30 segundos. Ajusta según tu entorno.

## 🆘 Soporte

Si sigues teniendo problemas:
1. Revisa los logs del servidor para más detalles
2. Verifica que SQL Server Browser esté corriendo (para instancias nombradas)
3. Verifica que TCP/IP esté habilitado en SQL Server Configuration Manager

