# Base de Datos - Sistema de Menú QR

## Descripción

Esquema de base de datos diseñado para SQL Server con soporte multi-tenancy y funcionalidad tipo Linktr.ee/Beacons.ai.

## Características Principales

### 🏢 Multi-tenancy
- Sistema de filas con `restaurant_id` en todas las tablas relacionadas
- Cada restaurante es completamente independiente
- Aislamiento de datos por restaurante

### 🎨 Páginas Personalizables (Tipo Linktr.ee)
Cada restaurante puede personalizar su página pública con:
- Perfil con imagen y portada
- Bio/descripción
- Enlaces sociales personalizables (`restaurant_links`)
- Colores y temas personalizados
- Configuración de qué secciones mostrar

### 📋 Funcionalidades del Sistema

1. **Gestión de Restaurantes**
   - Información completa del restaurante
   - Configuración de tema y personalización
   - Suscripciones y facturación

2. **Menú y Catálogo**
   - Categorías de platos
   - Items del menú con precios
   - Adiciones/Extras configurables
   - Opciones de adiciones (tamaños, ingredientes, etc.)

3. **Gestión de Pedidos**
   - Pedidos por mesa
   - Items del pedido con adiciones
   - Historial de cambios de estado
   - Seguimiento en tiempo real

4. **Usuarios y Roles**
   - Sistema RBAC (Role-Based Access Control)
   - Roles: Super Admin, Admin, Mesero, Cocina
   - Asignación de roles por restaurante

5. **Reservas de Mesas** (Solo PREMIUM)
   - Sistema de reservas de mesas
   - Configuración de horarios y políticas
   - Confirmación y gestión de reservas
   - Historial de cambios de estado
   - Notificaciones y recordatorios

6. **Analytics**
   - Seguimiento de eventos
   - Métricas de uso
   - Estadísticas de pedidos

## Tablas Principales

### Core
- `restaurantes` - Restaurantes (tenants)
- `usuarios` - Usuarios del sistema
- `roles` - Roles disponibles
- `roles_usuario` - Asignación de roles

### Perfil Público (Linktr.ee)
- `enlaces_restaurante` - Enlaces sociales del restaurante

### Operaciones
- `mesas` - Mesas del restaurante
- `categorias` - Categorías de platos
- `items_menu` - Platos del menú
- `adiciones` - Adiciones/Extras
- `opciones_adiciones` - Opciones de adiciones
- `items_menu_adiciones` - Relación platos-adiciones

### Pedidos
- `pedidos` - Pedidos
- `items_pedido` - Items del pedido
- `items_pedido_adiciones` - Adiciones seleccionadas
- `historial_estado_pedido` - Historial de estados

### Reservas (Solo PREMIUM)
- `configuracion_reservas` - Configuración de reservas por restaurante
- `reservas` - Reservas de mesas
- `historial_estado_reserva` - Historial de cambios de estado de reservas

### Facturación
- `suscripciones` - Suscripciones
- `pagos` - Pagos

### Sistema
- `notificaciones` - Notificaciones
- `analiticas` - Analytics y métricas
- `logs_sistema` - Logs y auditoría del sistema

## Instalación

### Requisitos
- SQL Server 2019 o superior
- Permisos de administrador para crear base de datos

### Pasos

1. **Crear la base de datos:**
```sql
CREATE DATABASE MenuQR;
GO

USE MenuQR;
GO
```

2. **Ejecutar el script de esquema:**
```bash
sqlcmd -S localhost -d MenuQR -i schema.sql
```

O desde SQL Server Management Studio (SSMS):
- Abrir `schema.sql`
- Ejecutar el script completo

3. **Verificar la instalación:**
```sql
SELECT COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';
```

Debería retornar el número de tablas creadas.

## Convenciones

### Nombres
- Tablas: plural en español, snake_case (ej: `enlaces_restaurante`)
- Columnas: snake_case en español (ej: `fecha_creacion`)
- Foreign Keys: `{tabla}_id` (ej: `restaurante_id`)

### Tipos de Datos
- IDs: `UNIQUEIDENTIFIER` (GUID)
- Texto corto: `NVARCHAR(n)`
- Texto largo: `NVARCHAR(MAX)`
- Decimales: `DECIMAL(10, 2)` para monedas
- Fechas: `DATETIME2` (columnas: `fecha_creacion`, `fecha_actualizacion`, etc.)
- Booleanos: `BIT` (columnas: `activo`, `disponible`, etc.)

### Índices
- Primary Keys en todas las tablas
- Índices en Foreign Keys
- Índices en columnas de búsqueda frecuente (slug, email, status)

### Soft Deletes
- Tablas importantes usan `fecha_eliminacion` para soft deletes
- No se eliminan físicamente los registros

## Diagrama de Relaciones

Ver `database/diagram.md` para el diagrama completo de relaciones entre tablas.

## Vistas y Stored Procedures

### Vistas
- `v_pedidos_activos` - Pedidos activos con información completa
- `v_estadisticas_restaurante` - Estadísticas de restaurantes

### Stored Procedures
- `sp_crear_restaurante_con_admin` - Crear restaurante con usuario admin inicial

## Migraciones Futuras

Para futuras migraciones, considerar usar:
- TypeORM Migrations
- Fluent Migrator
- Scripts SQL versionados

## Seguridad

- Todas las contraseñas deben almacenarse hasheadas (bcrypt)
- Validación de datos en aplicación (no solo en BD)
- Row-level security por `restaurant_id` en aplicación
- Considerar usar SQL Server Row-Level Security si es necesario

## Optimización

- Índices creados en columnas de búsqueda frecuente
- Considerar particionamiento para tablas grandes (orders, analytics)
- Mantener estadísticas actualizadas
- Monitorear queries lentas

## Backup

Se recomienda:
- Backups completos diarios
- Backups diferenciales cada 6 horas
- Backups de transacciones cada hora (si se requiere punto de recuperación)

## Notas Importantes

1. **Multi-tenancy**: Siempre filtrar por `restaurante_id` en queries
2. **Soft Deletes**: Verificar `fecha_eliminacion IS NULL` en queries
3. **Timestamps**: Usar `GETDATE()` para fechas del servidor
4. **GUIDs**: Usar `NEWID()` para generar IDs únicos
5. **Nombres en español**: Todas las tablas y columnas están en español para mejor legibilidad

