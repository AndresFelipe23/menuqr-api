-- =============================================
-- ALTER TABLE para cambiar fecha_creacion a SYSUTCDATETIME()
-- Tabla: logs_sistema
-- =============================================

USE MenuQR;
GO

-- Paso 1: Eliminar el constraint DEFAULT anterior
DECLARE @ConstraintName NVARCHAR(200);

SELECT @ConstraintName = name 
FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('logs_sistema') 
  AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX) = 'ALTER TABLE logs_sistema DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @sql;
    PRINT 'Constraint eliminado: ' + @ConstraintName;
END
ELSE
BEGIN
    PRINT 'No se encontró constraint DEFAULT para fecha_creacion';
END

-- Paso 2: Agregar nuevo constraint DEFAULT con SYSUTCDATETIME()
ALTER TABLE logs_sistema
ADD CONSTRAINT DF_logs_sistema_fecha_creacion DEFAULT SYSUTCDATETIME() FOR fecha_creacion;

PRINT '✅ Constraint DEFAULT agregado con SYSUTCDATETIME()';

-- Paso 3: Verificar el cambio
SELECT 
    dc.name AS ConstraintName,
    dc.definition AS DefaultValue,
    OBJECT_NAME(dc.parent_object_id) AS TableName
FROM sys.default_constraints dc
WHERE dc.parent_object_id = OBJECT_ID('logs_sistema') 
  AND dc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

GO

