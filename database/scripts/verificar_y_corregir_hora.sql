-- =============================================
-- Script para verificar y corregir la hora en logs_sistema
-- =============================================
-- Este script verifica si la hora se está guardando correctamente
-- y si es necesario, ajusta cómo se guarda o se muestra

USE MenuQR;
GO

-- PASO 1: Verificar hora actual del servidor
PRINT '=== DIAGNÓSTICO DE HORA ===';
PRINT '';

SELECT 
    'Hora Local del Servidor SQL' AS Tipo,
    CAST(GETDATE() AS NVARCHAR(50)) AS Valor
UNION ALL
SELECT 
    'Hora UTC del Servidor SQL',
    CAST(GETUTCDATE() AS NVARCHAR(50))
UNION ALL
SELECT 
    'Fecha con Offset',
    CAST(SYSDATETIMEOFFSET() AS NVARCHAR(50))
UNION ALL
SELECT 
    'Diferencia en Horas (UTC - Local)',
    CAST(DATEDIFF(HOUR, GETDATE(), GETUTCDATE()) AS NVARCHAR(50)) + ' horas';

PRINT '';
PRINT 'Diferencia de horas: ' + CAST(DATEDIFF(HOUR, GETDATE(), GETUTCDATE()) AS VARCHAR(10));

-- PASO 2: Verificar última hora guardada en logs
PRINT '';
PRINT '=== ÚLTIMOS LOGS GUARDADOS ===';
PRINT '';

SELECT TOP 5
    id,
    mensaje,
    fecha_creacion AS FechaGuardada,
    GETUTCDATE() AS HoraUTCActual,
    DATEDIFF(MINUTE, fecha_creacion, GETUTCDATE()) AS MinutosDiferencia,
    DATEDIFF(HOUR, fecha_creacion, GETUTCDATE()) AS HorasDiferencia
FROM logs_sistema
ORDER BY fecha_creacion DESC;

-- PASO 3: Verificar el constraint DEFAULT
PRINT '';
PRINT '=== CONSTRAINT DEFAULT ACTUAL ===';
PRINT '';

DECLARE @ConstraintName NVARCHAR(200);
DECLARE @Definition NVARCHAR(MAX);

SELECT 
    @ConstraintName = dc.name,
    @Definition = dc.definition
FROM sys.default_constraints dc
WHERE dc.parent_object_id = OBJECT_ID('logs_sistema') 
  AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

IF @ConstraintName IS NOT NULL
BEGIN
    PRINT 'Constraint encontrado: ' + @ConstraintName;
    PRINT 'Definición: ' + @Definition;
    
    -- Verificar si usa SYSUTCDATETIME
    IF @Definition LIKE '%SYSUTCDATETIME%'
    BEGIN
        PRINT '✅ El constraint ya usa SYSUTCDATETIME()';
    END
    ELSE
    BEGIN
        PRINT '⚠️  El constraint NO usa SYSUTCDATETIME()';
        PRINT '   Es necesario actualizar el constraint.';
    END
END
ELSE
BEGIN
    PRINT '⚠️  No se encontró constraint DEFAULT';
END

-- PASO 4: Si la hora está incorrecta, mostrar solución
PRINT '';
PRINT '=== RECOMENDACIONES ===';
PRINT '';

DECLARE @DiffHours INT = DATEDIFF(HOUR, GETDATE(), GETUTCDATE());

IF ABS(@DiffHours) > 0
BEGIN
    PRINT 'El servidor tiene una diferencia de ' + CAST(ABS(@DiffHours) AS VARCHAR(10)) + ' horas con UTC.';
    PRINT 'Esto es normal si el servidor no está en UTC.';
    PRINT '';
    PRINT '✅ SOLUCIÓN: Asegúrate de que:';
    PRINT '   1. El constraint DEFAULT use SYSUTCDATETIME() (ya está configurado)';
    PRINT '   2. Al consultar, convierte explícitamente a la zona horaria deseada';
    PRINT '';
    PRINT 'Para mostrar la fecha en hora local (ejemplo para Colombia UTC-5):';
    PRINT '   SELECT DATEADD(HOUR, -5, fecha_creacion) AS fecha_local FROM logs_sistema';
    PRINT '';
    PRINT 'Para mantener en UTC (recomendado para APIs):';
    PRINT '   SELECT fecha_creacion FROM logs_sistema';
END

GO

