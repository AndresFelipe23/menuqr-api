-- =============================================
-- Script para actualizar fechas de restaurantes a hora local de Montería
-- =============================================

-- Actualizar el trigger de fecha_actualizacion para usar hora local de Montería
-- Nota: SQL Server no tiene una función nativa para UTC-5, pero podemos ajustar
-- el trigger para que calcule la hora local. Sin embargo, como estamos estableciendo
-- explícitamente las fechas en el código, este trigger solo se activará si hay
-- actualizaciones directas a la base de datos.

-- Primero, eliminamos el trigger existente
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_restaurantes_fecha_actualizacion')
BEGIN
    DROP TRIGGER tr_restaurantes_fecha_actualizacion;
    PRINT 'Trigger tr_restaurantes_fecha_actualizacion eliminado';
END
GO

-- Recreamos el trigger para que use la hora ajustada a Montería (UTC-5)
-- Nota: Este trigger solo actualiza fecha_actualizacion cuando hay cambios
-- El código de la aplicación establece explícitamente las fechas en hora local
CREATE TRIGGER tr_restaurantes_fecha_actualizacion
ON restaurantes
AFTER UPDATE
AS
BEGIN
    -- Calcular hora local de Montería (UTC-5)
    -- SYSDATETIMEOFFSET() obtiene la hora con offset, luego ajustamos a UTC-5
    UPDATE restaurantes
    SET fecha_actualizacion = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'UTC' AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2)
    FROM inserted
    WHERE restaurantes.id = inserted.id
    -- Solo actualizar si realmente hay cambios en otros campos (no solo fecha_actualizacion)
    AND (
        (UPDATE(nombre)) OR (UPDATE(slug)) OR (UPDATE(correo)) OR (UPDATE(telefono)) OR
        (UPDATE(biografia)) OR (UPDATE(imagen_perfil_url)) OR (UPDATE(imagen_portada_url)) OR
        (UPDATE(color_tema)) OR (UPDATE(color_texto)) OR (UPDATE(color_fondo)) OR (UPDATE(familia_fuente)) OR
        (UPDATE(mostrar_menu)) OR (UPDATE(mostrar_enlaces)) OR (UPDATE(mostrar_contacto)) OR
        (UPDATE(direccion)) OR (UPDATE(ciudad)) OR (UPDATE(estado_provincia)) OR (UPDATE(pais)) OR (UPDATE(codigo_postal)) OR
        (UPDATE(latitud)) OR (UPDATE(longitud)) OR (UPDATE(zona_horaria)) OR (UPDATE(moneda)) OR (UPDATE(idioma)) OR
        (UPDATE(activo)) OR (UPDATE(estado_suscripcion))
    );
END;
GO

PRINT 'Trigger tr_restaurantes_fecha_actualizacion recreado con hora local de Montería';
GO

-- Actualizar el stored procedure para usar fechas en hora local
-- Primero verificamos si existe
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_crear_restaurante_con_admin')
BEGIN
    DROP PROCEDURE sp_crear_restaurante_con_admin;
    PRINT 'Stored procedure sp_crear_restaurante_con_admin eliminado para recreación';
END
GO

-- Recrear el stored procedure con fechas en hora local de Montería
CREATE PROCEDURE sp_crear_restaurante_con_admin
    @NombreRestaurante NVARCHAR(200),
    @Slug NVARCHAR(100),
    @Correo NVARCHAR(255),
    @HashContrasena NVARCHAR(255),
    @NombreAdmin NVARCHAR(100),
    @ApellidoAdmin NVARCHAR(100),
    @RestauranteId UNIQUEIDENTIFIER OUTPUT,
    @UsuarioId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @FechaActual DATETIME2;
    -- Calcular hora local de Montería (UTC-5)
    SET @FechaActual = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'UTC' AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2);
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Crear restaurante con fechas en hora local
        SET @RestauranteId = NEWID();
        INSERT INTO restaurantes (id, nombre, slug, correo, activo, fecha_creacion, fecha_actualizacion)
        VALUES (@RestauranteId, @NombreRestaurante, @Slug, @Correo, 1, @FechaActual, @FechaActual);
        
        -- Crear usuario admin
        SET @UsuarioId = NEWID();
        DECLARE @RolAdminId UNIQUEIDENTIFIER;
        SELECT @RolAdminId = id FROM roles WHERE nombre = 'Administrador';
        
        INSERT INTO usuarios (id, correo, hash_contrasena, nombre, apellido, restaurante_id, correo_verificado, activo, fecha_creacion, fecha_actualizacion)
        VALUES (@UsuarioId, @Correo, @HashContrasena, @NombreAdmin, @ApellidoAdmin, @RestauranteId, 1, 1, @FechaActual, @FechaActual);
        
        -- Asignar rol admin
        INSERT INTO roles_usuario (id, usuario_id, rol_id, restaurante_id)
        VALUES (NEWID(), @UsuarioId, @RolAdminId, @RestauranteId);
        
        -- Crear suscripción trial con fechas en hora local
        DECLARE @FinTrial DATETIME2;
        SET @FinTrial = DATEADD(DAY, 14, @FechaActual); -- 14 días desde fecha actual en hora local
        
        INSERT INTO suscripciones (id, restaurante_id, tipo_plan, estado, inicio_periodo_actual, fin_periodo_actual, fecha_creacion, fecha_actualizacion)
        VALUES (
            NEWID(),
            @RestauranteId,
            'trial',
            'trialing',
            @FechaActual,
            @FinTrial,
            @FechaActual,
            @FechaActual
        );
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

PRINT 'Stored procedure sp_crear_restaurante_con_admin recreado con fechas en hora local de Montería';
GO

