# Configurar Hora en SQL Server

## Problema
Si la hora se guarda incorrectamente en los logs, puede ser por la configuración de zona horaria del servidor SQL Server.

## Soluciones

### Opción 1: Usar SYSUTCDATETIME() en SQL Server (Recomendado)

Si quieres que SQL Server use UTC directamente, puedes modificar el schema para que el DEFAULT use `SYSUTCDATETIME()`:

```sql
-- Modificar la columna fecha_creacion en logs_sistema
ALTER TABLE logs_sistema
ALTER COLUMN fecha_creacion DATETIME2 DEFAULT SYSUTCDATETIME();
```

Luego, en el código, no pases `fecha_creacion` y deja que use el DEFAULT:

```typescript
// Remover fecha_creacion del INSERT y dejar que SQL Server use el DEFAULT
await AppDataSource.query(`
  INSERT INTO logs_sistema (
    nivel, categoria, mensaje, ...
    -- fecha_creacion se omite para usar DEFAULT
  )
  VALUES (...)
`);
```

### Opción 2: Configurar Zona Horaria en SQL Server

Verificar la zona horaria actual:

```sql
SELECT 
    GETDATE() AS FechaLocal,
    GETUTCDATE() AS FechaUTC,
    SYSDATETIMEOFFSET() AS FechaConOffset;
```

Para cambiar la zona horaria del servidor (requiere reinicio):

1. Configurar a través de Windows:
   - Panel de Control → Configuración Regional → Zona Horaria
   - Reiniciar el servicio SQL Server

2. O usar configuración regional:

```sql
-- Ver configuración actual
EXEC xp_regread 
    'HKEY_LOCAL_MACHINE', 
    'SYSTEM\CurrentControlSet\Control\TimeZoneInformation',
    'TimeZoneKeyName';
```

### Opción 3: Usar DATETIMEOFFSET (Para futuras mejoras)

Si necesitas guardar la zona horaria explícitamente:

```sql
-- Cambiar el tipo de columna
ALTER TABLE logs_sistema
ALTER COLUMN fecha_creacion DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET();
```

Esto guardará la fecha con información de zona horaria.

### Opción 4: Verificar desde la Aplicación

El código actual envía la fecha desde Node.js. Para verificar que la fecha se está enviando correctamente:

```typescript
// Agregar log temporal para debug
const fechaCreacion = new Date();
console.log('Fecha UTC enviada:', fechaCreacion.toISOString());
console.log('Fecha UTC timestamp:', fechaCreacion.getTime());
```

## Recomendación

**Usar SYSUTCDATETIME() como DEFAULT en SQL Server** es la mejor opción porque:
- Garantiza que siempre use UTC
- No depende de la configuración del servidor
- Es más eficiente (menos datos enviados)
- Consistente entre todos los inserts

## Pasos para Implementar Opción 1

1. Ejecutar el ALTER TABLE en SQL Server:
```sql
ALTER TABLE logs_sistema
ALTER COLUMN fecha_creacion DATETIME2 DEFAULT SYSUTCDATETIME();
```

2. Modificar el código para no enviar `fecha_creacion` en el INSERT
3. Verificar que los logs se guarden con hora UTC correcta

