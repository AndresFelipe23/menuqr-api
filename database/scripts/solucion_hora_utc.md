# Solución: Hora incorrecta en logs_sistema

## Problema
La hora se guarda en UTC pero se muestra en hora local, causando una diferencia de horas (pero los minutos son correctos).

## Solución

### Opción 1: Consultar en UTC (Recomendado para APIs)

Si tu servidor está en una zona horaria diferente a UTC (ej: Colombia UTC-5), la hora se guardará en UTC pero SQL Server Management Studio la puede mostrar según la configuración local.

**Para consultar y mantener UTC:**
```sql
-- Simplemente consulta la fecha directamente
SELECT 
    id,
    mensaje,
    fecha_creacion -- Ya está en UTC
FROM logs_sistema
ORDER BY fecha_creacion DESC;
```

### Opción 2: Convertir a hora local al consultar

Si necesitas ver la hora en tu zona horaria local:

**Para Colombia (UTC-5):**
```sql
SELECT 
    id,
    mensaje,
    DATEADD(HOUR, -5, fecha_creacion) AS fecha_local, -- Convertir UTC-5 a hora local
    fecha_creacion AS fecha_utc
FROM logs_sistema
ORDER BY fecha_creacion DESC;
```

**Para Argentina (UTC-3):**
```sql
SELECT 
    id,
    mensaje,
    DATEADD(HOUR, -3, fecha_creacion) AS fecha_local, -- Convertir UTC-3 a hora local
    fecha_creacion AS fecha_utc
FROM logs_sistema
ORDER BY fecha_creacion DESC;
```

### Opción 3: Verificar qué hora se está guardando realmente

Ejecuta este script para verificar:
```sql
USE MenuQR;
GO

SELECT 
    GETDATE() AS HoraLocalServidor,
    GETUTCDATE() AS HoraUTCServidor,
    DATEDIFF(HOUR, GETDATE(), GETUTCDATE()) AS DiferenciaHoras;

-- Ver últimos logs
SELECT TOP 5
    id,
    mensaje,
    fecha_creacion AS FechaGuardada,
    GETUTCDATE() AS HoraUTCActual,
    DATEDIFF(MINUTE, fecha_creacion, GETUTCDATE()) AS MinutosDiferencia
FROM logs_sistema
ORDER BY fecha_creacion DESC;
```

## Verificar que el constraint esté correcto

```sql
-- Verificar constraint DEFAULT
SELECT 
    dc.name AS ConstraintName,
    dc.definition AS DefaultValue
FROM sys.default_constraints dc
WHERE dc.parent_object_id = OBJECT_ID('logs_sistema') 
  AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');
```

Debe mostrar: `SYSUTCDATETIME()`

## Nota Importante

**SQL Server Management Studio muestra fechas DATETIME2 sin información de zona horaria**, así que aunque esté guardado en UTC, puede mostrarlo según la configuración local del servidor.

La solución correcta es:
1. ✅ Guardar siempre en UTC (ya está hecho con SYSUTCDATETIME())
2. ✅ Al consultar desde la aplicación, mantener UTC o convertir según necesidad
3. ✅ En SQL Server Management Studio, usar conversiones explícitas si necesitas ver hora local

