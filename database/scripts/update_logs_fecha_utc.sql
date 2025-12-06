-- =============================================
-- Script para actualizar logs_sistema a usar UTC
-- =============================================
-- Este script cambia el DEFAULT de fecha_creacion para usar SYSUTCDATETIME()
-- que garantiza que todas las fechas se guarden en UTC

USE MenuQR;
GO

-- Cambiar el DEFAULT de fecha_creacion a SYSUTCDATETIME()
-- Primero necesitamos eliminar el constraint DEFAULT actual
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name 
FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('logs_sistema') 
AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE logs_sistema DROP CONSTRAINT ' + @ConstraintName);
    PRINT 'Constraint DEFAULT eliminado: ' + @ConstraintName;
END

-- Agregar nuevo constraint con SYSUTCDATETIME()
ALTER TABLE logs_sistema
ADD CONSTRAINT DF_logs_sistema_fecha_creacion DEFAULT SYSUTCDATETIME() FOR fecha_creacion;

PRINT '✅ logs_sistema ahora usa SYSUTCDATETIME() como DEFAULT para fecha_creacion';

-- Verificar el cambio
SELECT 
    name AS ConstraintName,
    definition AS DefaultValue
FROM sys.default_constraints 
WHERE parent_object_id = OBJECT_ID('logs_sistema') 
AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('logs_sistema'), 'fecha_creacion', 'ColumnId');

GO

