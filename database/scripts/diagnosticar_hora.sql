-- =============================================
-- Script para diagnosticar problema de hora en logs_sistema
-- =============================================

USE MenuQR;
GO

-- Verificar las horas que se están guardando
SELECT 
    id,
    mensaje,
    fecha_creacion,
    -- Convertir a UTC explícitamente para verificar
    CONVERT(DATETIME2, fecha_creacion) AS FechaSinConversion,
    -- Obtener la hora actual del servidor
    GETDATE() AS HoraLocalServidor,
    GETUTCDATE() AS HoraUTCServidor,
    -- Ver diferencia
    DATEDIFF(HOUR, GETUTCDATE(), GETDATE()) AS DiferenciaHorasUTC_Local
FROM logs_sistema
ORDER BY fecha_creacion DESC
OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;

-- Verificar la configuración de zona horaria del servidor
SELECT 
    GETDATE() AS HoraLocal,
    GETUTCDATE() AS HoraUTC,
    SYSDATETIMEOFFSET() AS FechaConOffset,
    DATEDIFF(HOUR, GETUTCDATE(), GETDATE()) AS DiferenciaHoras,
    CASE 
        WHEN DATEDIFF(HOUR, GETUTCDATE(), GETDATE()) = -5 THEN 'America/Bogota (UTC-5)'
        WHEN DATEDIFF(HOUR, GETUTCDATE(), GETDATE()) = -3 THEN 'America/Argentina (UTC-3)'
        WHEN DATEDIFF(HOUR, GETUTCDATE(), GETDATE()) = 0 THEN 'UTC'
        ELSE 'Otra zona horaria'
    END AS ZonaHorariaDetectada;

-- Verificar el constraint DEFAULT actual
SELECT 
    dc.name AS ConstraintName,
    dc.definition AS DefaultValue,
    OBJECT_NAME(dc.parent_object_id) AS TableName
FROM sys.default_constraints dc
WHERE dc.parent_object_id = OBJECT_ID('logs_sistema') 
  AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

GO

