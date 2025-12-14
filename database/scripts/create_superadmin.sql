-- Script para crear o actualizar usuario SuperAdministrador
-- IMPORTANTE: Este script actualiza la contraseña con un hash bcrypt
-- La contraseña es: 'superadmin'
-- Para generar un nuevo hash bcrypt, ejecuta en Node.js:
-- const bcrypt = require('bcrypt'); bcrypt.hash('superadmin', 10).then(h => console.log(h));

SET NOCOUNT ON;

-- Parámetros
DECLARE
    @Correo NVARCHAR(256) = 'superadmin@gmail.com',
    @Nombre NVARCHAR(256) = 'Super',
    @Apellido NVARCHAR(256) = 'Administrador',
    @Telefono NVARCHAR(50) = NULL,
    @RestauranteId UNIQUEIDENTIFIER = NULL, -- NULL para SuperAdmin
    -- Hash bcrypt de la contraseña 'superadmin' generado con salt rounds 10
    @HashContrasena NVARCHAR(255) = '$2b$10$rZ8KJz3Y7Fq1X4wV9H2JGuP6yL8mN3kQ5sT7vW2xY9zA0bC1dE4fG6hI8jK1lM2n';

BEGIN TRY
    BEGIN TRANSACTION;

    -- Asegurar que existe el rol SuperAdministrador
    DECLARE @RolId UNIQUEIDENTIFIER;
    SELECT TOP (1) @RolId = id FROM dbo.roles WHERE nombre = 'SuperAdministrador';

    IF @RolId IS NULL
    BEGIN
        SET @RolId = NEWID();
        INSERT INTO dbo.roles (id, nombre, descripcion, fecha_creacion, fecha_actualizacion)
        VALUES (@RolId, 'SuperAdministrador', 'Administrador de la plataforma', GETDATE(), GETDATE());
        
        PRINT 'Rol SuperAdministrador creado: ' + CAST(@RolId AS NVARCHAR(36));
    END
    ELSE
    BEGIN
        PRINT 'Rol SuperAdministrador ya existe: ' + CAST(@RolId AS NVARCHAR(36));
    END

    -- Verificar si el usuario ya existe
    DECLARE @UsuarioId UNIQUEIDENTIFIER;
    SELECT TOP (1) @UsuarioId = id FROM dbo.usuarios WHERE correo = @Correo AND fecha_eliminacion IS NULL;

    IF @UsuarioId IS NULL
    BEGIN
        -- Crear nuevo usuario
        SET @UsuarioId = NEWID();
        INSERT INTO dbo.usuarios (id, correo, hash_contrasena, nombre, apellido, telefono, restaurante_id, activo, correo_verificado, fecha_creacion, fecha_actualizacion)
        VALUES (@UsuarioId, @Correo, @HashContrasena, @Nombre, @Apellido, @Telefono, @RestauranteId, 1, 1, GETDATE(), GETDATE());
        
        PRINT 'Usuario SuperAdministrador creado: ' + CAST(@UsuarioId AS NVARCHAR(36));
    END
    ELSE
    BEGIN
        -- Actualizar usuario existente (principalmente el hash de contraseña)
        UPDATE dbo.usuarios 
        SET hash_contrasena = @HashContrasena,
            nombre = @Nombre,
            apellido = @Apellido,
            telefono = @Telefono,
            restaurante_id = @RestauranteId,
            activo = 1,
            correo_verificado = 1,
            fecha_actualizacion = GETDATE()
        WHERE id = @UsuarioId;
        
        PRINT 'Usuario SuperAdministrador actualizado: ' + CAST(@UsuarioId AS NVARCHAR(36));
        PRINT 'Contraseña actualizada con hash bcrypt.';
    END

    -- Asignar rol al usuario (sin restaurante_id para SuperAdmin)
    IF NOT EXISTS (
        SELECT 1 FROM dbo.roles_usuario ru
        WHERE ru.usuario_id = @UsuarioId
          AND ru.rol_id = @RolId
          AND ru.restaurante_id IS NULL
    )
    BEGIN
        INSERT INTO dbo.roles_usuario (id, usuario_id, rol_id, restaurante_id, fecha_creacion)
        VALUES (NEWID(), @UsuarioId, @RolId, NULL, GETDATE());
        
        PRINT 'Rol SuperAdministrador asignado al usuario (sin restaurante).';
    END
    ELSE
    BEGIN
        PRINT 'El usuario ya tiene el rol SuperAdministrador asignado.';
    END

    COMMIT TRANSACTION;

    -- Mostrar información del usuario creado/actualizado
    PRINT '';
    PRINT '=== USUARIO SUPERADMINISTRADOR ===';
    SELECT 
        u.id,
        u.correo,
        u.nombre + ' ' + u.apellido AS nombre_completo,
        u.restaurante_id,
        u.activo,
        u.correo_verificado,
        r.nombre AS rol_nombre
    FROM dbo.usuarios u
    INNER JOIN dbo.roles_usuario ru ON ru.usuario_id = u.id AND ru.restaurante_id IS NULL
    INNER JOIN dbo.roles r ON r.id = ru.rol_id
    WHERE u.id = @UsuarioId AND u.fecha_eliminacion IS NULL;

    PRINT '';
    PRINT 'Credenciales de acceso:';
    PRINT 'Email: ' + @Correo;
    PRINT 'Contraseña: superadmin';
    PRINT '';
    PRINT 'IMPORTANTE: Cambia la contraseña después del primer inicio de sesión por seguridad.';

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE(),
            @ErrorSeverity INT = ERROR_SEVERITY(),
            @ErrorState INT = ERROR_STATE();

    PRINT 'ERROR: ' + @ErrorMessage;
    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;

