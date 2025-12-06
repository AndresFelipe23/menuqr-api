-- =============================================
-- Script para verificar la hora de los logs guardados
-- =============================================

USE MenuQR;
GO

-- Ver últimos 5 logs con detalles de hora
SELECT TOP 5
    id,
    mensaje,
    fecha_creacion AS FechaGuardadaEnBD,
    GETUTCDATE() AS HoraUTCActualServidor,
    DATEDIFF(MINUTE, fecha_creacion, GETUTCDATE()) AS MinutosDiferencia,
    DATEDIFF(SECOND, fecha_creacion, GETUTCDATE()) AS SegundosDiferencia
    -- Para ver la hora en otra zona horaria, agrega:
    -- , DATEADD(HOUR, -5, fecha_creacion) AS HoraColombia -- UTC-5
    -- , DATEADD(HOUR, -3, fecha_creacion) AS HoraArgentina -- UTC-3
FROM logs_sistema
ORDER BY fecha_creacion DESC;

-- Verificar que el constraint use SYSUTCDATETIME()
SELECT 
    dc.name AS ConstraintName,
    dc.definition AS DefaultValue
FROM sys.default_constraints dc
WHERE dc.parent_object_id = OBJECT_ID('logs_sistema') 
  AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

-- Probar insertar un log de prueba para verificar la hora
PRINT 'Hora UTC actual del servidor: ' + CAST(GETUTCDATE() AS VARCHAR(50));

GO

