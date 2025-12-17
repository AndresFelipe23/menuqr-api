-- =============================================
-- Migración: Crear Tablas de Reservas
-- Fecha: 2024
-- Descripción: Agrega las tablas necesarias para el sistema de reservas de mesas (Solo PREMIUM)
-- =============================================

-- Verificar si las tablas ya existen antes de crearlas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'configuracion_reservas')
BEGIN
    -- =============================================
    -- TABLA: configuracion_reservas (Configuración de reservas por restaurante)
    -- =============================================
    CREATE TABLE configuracion_reservas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        restaurante_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
        
        -- Habilitación
        reservas_habilitadas BIT DEFAULT 1,
        
        -- Horarios de atención
        hora_apertura_lunes TIME,
        hora_cierre_lunes TIME,
        hora_apertura_martes TIME,
        hora_cierre_martes TIME,
        hora_apertura_miercoles TIME,
        hora_cierre_miercoles TIME,
        hora_apertura_jueves TIME,
        hora_cierre_jueves TIME,
        hora_apertura_viernes TIME,
        hora_cierre_viernes TIME,
        hora_apertura_sabado TIME,
        hora_cierre_sabado TIME,
        hora_apertura_domingo TIME,
        hora_cierre_domingo TIME,
        
        -- Configuración de reservas
        anticipacion_minima_horas INT DEFAULT 2, -- Horas mínimas de anticipación para reservar
        anticipacion_maxima_dias INT DEFAULT 30, -- Días máximos de anticipación
        duracion_reserva_minutos INT DEFAULT 120, -- Duración estimada de una reserva (2 horas por defecto)
        intervalo_reservas_minutos INT DEFAULT 15, -- Intervalo entre reservas (15, 30, 60 minutos)
        
        -- Límites
        capacidad_maxima_personas INT DEFAULT 20, -- Capacidad máxima por reserva
        capacidad_minima_personas INT DEFAULT 1, -- Capacidad mínima por reserva
        
        -- Confirmación automática
        confirmacion_automatica BIT DEFAULT 0, -- Si las reservas se confirman automáticamente
        requiere_confirmacion_cliente BIT DEFAULT 1, -- Si requiere confirmación del cliente
        
        -- Notificaciones
        notificar_reserva_nueva BIT DEFAULT 1,
        notificar_cancelacion BIT DEFAULT 1,
        notificar_recordatorio BIT DEFAULT 1,
        horas_antes_recordatorio INT DEFAULT 24, -- Horas antes de la reserva para enviar recordatorio
        
        -- Políticas
        permitir_cancelacion BIT DEFAULT 1,
        horas_minimas_cancelacion INT DEFAULT 2, -- Horas mínimas antes de la reserva para cancelar sin penalización
        politica_no_show NVARCHAR(500), -- Política para clientes que no se presentan
        
        fecha_creacion DATETIME2 DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
        INDEX IX_configuracion_reservas_restaurante_id (restaurante_id)
    );
    
    PRINT 'Tabla configuracion_reservas creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla configuracion_reservas ya existe.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reservas')
BEGIN
    -- =============================================
    -- TABLA: reservas (Reservas de mesas - Solo PREMIUM)
    -- =============================================
    CREATE TABLE reservas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        restaurante_id UNIQUEIDENTIFIER NOT NULL,
        mesa_id UNIQUEIDENTIFIER NOT NULL,
        
        -- Información del cliente
        nombre_cliente NVARCHAR(200) NOT NULL,
        correo_cliente NVARCHAR(255) NOT NULL,
        telefono_cliente NVARCHAR(50) NOT NULL,
        
        -- Detalles de la reserva
        fecha_reserva DATETIME2 NOT NULL, -- Fecha y hora de la reserva
        numero_personas INT NOT NULL DEFAULT 2,
        
        -- Estado de la reserva
        estado NVARCHAR(50) DEFAULT 'pendiente', -- pendiente, confirmada, cancelada, completada, no_show, expirada
        codigo_confirmacion NVARCHAR(20) UNIQUE, -- Código único para confirmar la reserva
        
        -- Notas y observaciones
        notas_cliente NVARCHAR(1000), -- Notas del cliente (alergias, preferencias, etc.)
        notas_internas NVARCHAR(1000), -- Notas internas del restaurante
        
        -- Asignación
        mesero_asignado_id UNIQUEIDENTIFIER NULL,
        
        -- Confirmación
        confirmada BIT DEFAULT 0,
        fecha_confirmacion DATETIME2,
        confirmada_por_id UNIQUEIDENTIFIER NULL, -- Usuario que confirmó la reserva
        
        -- Cancelación
        cancelada BIT DEFAULT 0,
        fecha_cancelacion DATETIME2,
        cancelada_por_id UNIQUEIDENTIFIER NULL, -- Usuario que canceló (NULL si fue el cliente)
        motivo_cancelacion NVARCHAR(500),
        
        -- Llegada
        fecha_llegada DATETIME2, -- Fecha y hora real de llegada del cliente
        fecha_salida DATETIME2, -- Fecha y hora real de salida del cliente
        
        -- Tiempos
        fecha_creacion DATETIME2 DEFAULT GETDATE(),
        fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
        fecha_eliminacion DATETIME2 NULL,
        
        FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
        FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE NO ACTION,
        FOREIGN KEY (mesero_asignado_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
        FOREIGN KEY (confirmada_por_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
        FOREIGN KEY (cancelada_por_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
        
        INDEX IX_reservas_restaurante_id (restaurante_id),
        INDEX IX_reservas_mesa_id (mesa_id),
        INDEX IX_reservas_fecha_reserva (fecha_reserva),
        INDEX IX_reservas_estado (estado),
        INDEX IX_reservas_codigo_confirmacion (codigo_confirmacion),
        INDEX IX_reservas_correo_cliente (correo_cliente),
        INDEX IX_reservas_telefono_cliente (telefono_cliente),
        INDEX IX_reservas_fecha_creacion (fecha_creacion)
    );
    
    PRINT 'Tabla reservas creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla reservas ya existe.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'historial_estado_reserva')
BEGIN
    -- =============================================
    -- TABLA: historial_estado_reserva (Historial de cambios de estado de reservas)
    -- =============================================
    CREATE TABLE historial_estado_reserva (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        reserva_id UNIQUEIDENTIFIER NOT NULL,
        
        estado_anterior NVARCHAR(50),
        estado_nuevo NVARCHAR(50) NOT NULL,
        cambiado_por_id UNIQUEIDENTIFIER NULL, -- Usuario que hizo el cambio (NULL si fue automático o cliente)
        notas NVARCHAR(500),
        
        fecha_creacion DATETIME2 DEFAULT GETDATE(),
        
        FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE,
        FOREIGN KEY (cambiado_por_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
        
        INDEX IX_historial_estado_reserva_reserva_id (reserva_id),
        INDEX IX_historial_estado_reserva_fecha_creacion (fecha_creacion)
    );
    
    PRINT 'Tabla historial_estado_reserva creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla historial_estado_reserva ya existe.';
END
GO

-- =============================================
-- Triggers para fecha_actualizacion
-- =============================================

-- Eliminar trigger si existe antes de crearlo
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_configuracion_reservas_fecha_actualizacion')
BEGIN
    DROP TRIGGER tr_configuracion_reservas_fecha_actualizacion;
    PRINT 'Trigger tr_configuracion_reservas_fecha_actualizacion eliminado.';
END
GO

-- Crear trigger para configuracion_reservas
CREATE TRIGGER tr_configuracion_reservas_fecha_actualizacion
ON configuracion_reservas
AFTER UPDATE
AS
BEGIN
    UPDATE configuracion_reservas
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE configuracion_reservas.id = inserted.id;
END;
GO

-- Eliminar trigger si existe antes de crearlo
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_reservas_fecha_actualizacion')
BEGIN
    DROP TRIGGER tr_reservas_fecha_actualizacion;
    PRINT 'Trigger tr_reservas_fecha_actualizacion eliminado.';
END
GO

-- Crear trigger para reservas
CREATE TRIGGER tr_reservas_fecha_actualizacion
ON reservas
AFTER UPDATE
AS
BEGIN
    UPDATE reservas
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE reservas.id = inserted.id;
END;
GO

PRINT 'Migración de tablas de reservas completada exitosamente.';

