-- =============================================
-- Migración: Convertir permisos JSON a tablas relacionales
-- =============================================
-- Este script:
-- 1. Crea la tabla permisos
-- 2. Crea la tabla roles_permisos (relación muchos a muchos)
-- 3. Migra los permisos existentes desde el campo JSON a las nuevas tablas
-- 4. Elimina el campo permisos de la tabla roles
-- =============================================

USE MenuQR;
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- =============================================
    -- PASO 1: Crear tabla permisos
    -- =============================================
    CREATE TABLE permisos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        codigo NVARCHAR(100) NOT NULL UNIQUE, -- Código único del permiso (ej: "restaurant.*", "orders.view")
        nombre NVARCHAR(200) NOT NULL, -- Nombre descriptivo del permiso
        descripcion NVARCHAR(500), -- Descripción del permiso
        modulo NVARCHAR(50), -- Módulo al que pertenece (restaurant, menu, users, orders, tables, etc.)
        activo BIT DEFAULT 1,
        
        fecha_creacion DATETIME2 DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
        
        INDEX IX_permisos_codigo (codigo),
        INDEX IX_permisos_modulo (modulo),
        INDEX IX_permisos_activo (activo)
    );
    
    PRINT '✅ Tabla permisos creada exitosamente';

    -- =============================================
    -- PASO 2: Crear tabla roles_permisos (relación muchos a muchos)
    -- =============================================
    CREATE TABLE roles_permisos (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        rol_id UNIQUEIDENTIFIER NOT NULL,
        permiso_id UNIQUEIDENTIFIER NOT NULL,
        
        fecha_creacion DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
        
        UNIQUE (rol_id, permiso_id),
        INDEX IX_roles_permisos_rol_id (rol_id),
        INDEX IX_roles_permisos_permiso_id (permiso_id)
    );
    
    PRINT '✅ Tabla roles_permisos creada exitosamente';

    -- =============================================
    -- PASO 3: Crear trigger para fecha_actualizacion en permisos
    -- =============================================
    CREATE TRIGGER tr_permisos_fecha_actualizacion
    ON permisos
    AFTER UPDATE
    AS
    BEGIN
        UPDATE permisos
        SET fecha_actualizacion = GETDATE()
        FROM inserted
        WHERE permisos.id = inserted.id;
    END;
    
    PRINT '✅ Trigger para permisos creado exitosamente';

    -- =============================================
    -- PASO 4: Insertar permisos base del sistema
    -- =============================================
    
    -- Permiso especial de super administrador
    DECLARE @PermisoSuperAdmin UNIQUEIDENTIFIER = NEWID();
    INSERT INTO permisos (id, codigo, nombre, descripcion, modulo) VALUES
    (@PermisoSuperAdmin, '*', 'Todos los permisos', 'Permiso especial que otorga acceso completo al sistema', 'sistema');
    
    -- Permisos de restaurante
    DECLARE @PermisoRestaurantAll UNIQUEIDENTIFIER = NEWID();
    INSERT INTO permisos (id, codigo, nombre, descripcion, modulo) VALUES
    (@PermisoRestaurantAll, 'restaurant.*', 'Gestión completa de restaurante', 'Todos los permisos relacionados con restaurantes', 'restaurant');
    
    -- Permisos de menú
    DECLARE @PermisoMenuAll UNIQUEIDENTIFIER = NEWID();
    INSERT INTO permisos (id, codigo, nombre, descripcion, modulo) VALUES
    (@PermisoMenuAll, 'menu.*', 'Gestión completa de menú', 'Todos los permisos relacionados con menús y categorías', 'menu');
    
    -- Permisos de usuarios
    DECLARE @PermisoUsersAll UNIQUEIDENTIFIER = NEWID();
    INSERT INTO permisos (id, codigo, nombre, descripcion, modulo) VALUES
    (@PermisoUsersAll, 'users.*', 'Gestión completa de usuarios', 'Todos los permisos relacionados con usuarios', 'users');
    
    -- Permisos de pedidos
    DECLARE @PermisoOrdersView UNIQUEIDENTIFIER = NEWID();
    DECLARE @PermisoOrdersUpdateStatus UNIQUEIDENTIFIER = NEWID();
    INSERT INTO permisos (id, codigo, nombre, descripcion, modulo) VALUES
    (@PermisoOrdersView, 'orders.view', 'Ver pedidos', 'Permiso para visualizar pedidos', 'orders'),
    (@PermisoOrdersUpdateStatus, 'orders.update_status', 'Actualizar estado de pedidos', 'Permiso para cambiar el estado de los pedidos', 'orders');
    
    -- Permisos de mesas
    DECLARE @PermisoTablesView UNIQUEIDENTIFIER = NEWID();
    INSERT INTO permisos (id, codigo, nombre, descripcion, modulo) VALUES
    (@PermisoTablesView, 'tables.view', 'Ver mesas', 'Permiso para visualizar mesas', 'tables');
    
    PRINT '✅ Permisos base insertados exitosamente';

    -- =============================================
    -- PASO 5: Migrar permisos existentes desde roles a roles_permisos
    -- =============================================
    
    -- Migrar permisos del SuperAdministrador
    DECLARE @RolSuperAdmin UNIQUEIDENTIFIER;
    SELECT @RolSuperAdmin = id FROM roles WHERE nombre = 'SuperAdministrador';
    
    IF @RolSuperAdmin IS NOT NULL
    BEGIN
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES (@RolSuperAdmin, @PermisoSuperAdmin);
        PRINT '✅ Permisos migrados para SuperAdministrador';
    END

    -- Migrar permisos del Administrador
    DECLARE @RolAdmin UNIQUEIDENTIFIER;
    SELECT @RolAdmin = id FROM roles WHERE nombre = 'Administrador';
    
    IF @RolAdmin IS NOT NULL
    BEGIN
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES 
            (@RolAdmin, @PermisoRestaurantAll),
            (@RolAdmin, @PermisoMenuAll),
            (@RolAdmin, @PermisoUsersAll),
            (@RolAdmin, @PermisoOrdersView);
        PRINT '✅ Permisos migrados para Administrador';
    END

    -- Migrar permisos del Mesero
    DECLARE @RolMesero UNIQUEIDENTIFIER;
    SELECT @RolMesero = id FROM roles WHERE nombre = 'Mesero';
    
    IF @RolMesero IS NOT NULL
    BEGIN
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES 
            (@RolMesero, @PermisoOrdersView),
            (@RolMesero, @PermisoOrdersUpdateStatus),
            (@RolMesero, @PermisoTablesView);
        PRINT '✅ Permisos migrados para Mesero';
    END

    -- Migrar permisos de Cocina
    DECLARE @RolCocina UNIQUEIDENTIFIER;
    SELECT @RolCocina = id FROM roles WHERE nombre = 'Cocina';
    
    IF @RolCocina IS NOT NULL
    BEGIN
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES 
            (@RolCocina, @PermisoOrdersView),
            (@RolCocina, @PermisoOrdersUpdateStatus);
        PRINT '✅ Permisos migrados para Cocina';
    END

    -- =============================================
    -- PASO 6: Eliminar el campo permisos de la tabla roles
    -- =============================================
    
    -- Eliminar el constraint DEFAULT si existe
    DECLARE @ConstraintName NVARCHAR(200);
    SELECT @ConstraintName = name 
    FROM sys.default_constraints 
    WHERE parent_object_id = OBJECT_ID('roles') 
    AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('roles'), 'permisos', 'ColumnId');
    
    IF @ConstraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE roles DROP CONSTRAINT ' + @ConstraintName);
        PRINT 'Constraint eliminado: ' + @ConstraintName;
    END
    
    -- Eliminar la columna permisos
    ALTER TABLE roles DROP COLUMN permisos;
    
    PRINT '✅ Columna permisos eliminada de la tabla roles';

    -- =============================================
    -- PASO 7: Verificación final
    -- =============================================
    
    PRINT '';
    PRINT '========================================';
    PRINT 'Resumen de la migración:';
    PRINT '========================================';
    
    -- Contar permisos creados
    DECLARE @TotalPermisos INT;
    SELECT @TotalPermisos = COUNT(*) FROM permisos;
    PRINT 'Total de permisos creados: ' + CAST(@TotalPermisos AS NVARCHAR(10));
    
    -- Contar relaciones roles-permisos
    DECLARE @TotalRelaciones INT;
    SELECT @TotalRelaciones = COUNT(*) FROM roles_permisos;
    PRINT 'Total de relaciones roles-permisos: ' + CAST(@TotalRelaciones AS NVARCHAR(10));
    
    -- Mostrar permisos por rol
    SELECT 
        r.nombre AS rol_nombre,
        COUNT(rp.id) AS total_permisos,
        STRING_AGG(p.codigo, ', ') AS permisos
    FROM roles r
    LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
    LEFT JOIN permisos p ON rp.permiso_id = p.id
    GROUP BY r.id, r.nombre
    ORDER BY r.nombre;

    COMMIT TRANSACTION;
    PRINT '';
    PRINT '✅ Migración completada exitosamente';
    PRINT '========================================';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ Error en la migración:';
    PRINT ERROR_MESSAGE();
    PRINT 'La transacción ha sido revertida.';
    THROW;
END CATCH;

GO

