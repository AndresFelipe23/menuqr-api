-- =============================================
-- TABLA: comentarios (Comentarios, quejas, solicitudes)
-- =============================================
CREATE TABLE comentarios (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    
    -- Relación con restaurante (opcional, puede ser comentario general)
    restaurante_id UNIQUEIDENTIFIER NULL,
    
    -- Relación con usuario (opcional, puede ser anónimo)
    usuario_id UNIQUEIDENTIFIER NULL,
    
    -- Información del comentario
    tipo NVARCHAR(50) NOT NULL DEFAULT 'comentario', -- comentario, queja, solicitud, sugerencia, pregunta
    asunto NVARCHAR(200) NOT NULL,
    mensaje NVARCHAR(MAX) NOT NULL,
    
    -- Estado y seguimiento
    estado NVARCHAR(50) NOT NULL DEFAULT 'pendiente', -- pendiente, en_proceso, resuelto, cerrado
    
    -- Respuesta del administrador
    respuesta NVARCHAR(MAX) NULL,
    usuario_respuesta_id UNIQUEIDENTIFIER NULL, -- Usuario que respondió
    
    -- Prioridad (opcional)
    prioridad NVARCHAR(20) DEFAULT 'normal', -- baja, normal, alta, urgente
    
    -- Metadatos
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    fecha_respuesta DATETIME2 NULL,
    fecha_eliminacion DATETIME2 NULL,
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_respuesta_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
    
    INDEX IX_comentarios_restaurante_id (restaurante_id),
    INDEX IX_comentarios_usuario_id (usuario_id),
    INDEX IX_comentarios_estado (estado),
    INDEX IX_comentarios_tipo (tipo),
    INDEX IX_comentarios_fecha_creacion (fecha_creacion)
);

