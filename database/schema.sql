-- =============================================
-- Sistema de Menú QR - Esquema de Base de Datos
-- Base de Datos: SQL Server
-- Diseñado para Multi-tenancy (Row-Level Security)
-- Incluye funcionalidad tipo Linktr.ee/Beacons.ai
-- =============================================

-- =============================================
-- TABLA: restaurantes (Tenants principales)
-- =============================================
CREATE TABLE restaurantes (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(200) NOT NULL,
    slug NVARCHAR(100) NOT NULL UNIQUE, -- Para URLs tipo: tuapp.com/[slug]
    correo NVARCHAR(255) NOT NULL,
    telefono NVARCHAR(50),
    
    -- Información del perfil público (tipo linktr.ee)
    biografia NVARCHAR(1000),
    imagen_perfil_url NVARCHAR(500),
    imagen_portada_url NVARCHAR(500),
    
    -- Configuración de tema/personalización
    color_tema NVARCHAR(7) DEFAULT '#000000', -- Color principal
    color_texto NVARCHAR(7) DEFAULT '#FFFFFF', -- Color de texto
    color_fondo NVARCHAR(7) DEFAULT '#FFFFFF', -- Color de fondo
    familia_fuente NVARCHAR(100) DEFAULT 'Arial',
    
    -- Configuración de página
    mostrar_menu BIT DEFAULT 1, -- Mostrar sección de menú
    mostrar_enlaces BIT DEFAULT 1, -- Mostrar enlaces sociales
    mostrar_contacto BIT DEFAULT 1, -- Mostrar información de contacto
    habilitar_pedidos BIT DEFAULT 1, -- Habilitar funcionalidad de pedidos (carrito y pedidos)
    
    -- Información de ubicación
    direccion NVARCHAR(500),
    ciudad NVARCHAR(100),
    estado_provincia NVARCHAR(100),
    pais NVARCHAR(100),
    codigo_postal NVARCHAR(20),
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    
    -- Configuración de negocio
    zona_horaria NVARCHAR(50) DEFAULT 'UTC',
    moneda NVARCHAR(3) DEFAULT 'USD',
    idioma NVARCHAR(10) DEFAULT 'es',
    
    -- Estado y suscripción
    activo BIT DEFAULT 1,
    estado_suscripcion NVARCHAR(20) DEFAULT 'trial', -- trial, active, cancelled, past_due
    
    -- Metadatos
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    fecha_eliminacion DATETIME2 NULL,
    
    -- Índices
    INDEX IX_restaurantes_slug (slug),
    INDEX IX_restaurantes_correo (correo),
    INDEX IX_restaurantes_estado_suscripcion (estado_suscripcion),
    INDEX IX_restaurantes_activo (activo)
);

-- =============================================
-- TABLA: enlaces_restaurante (Enlaces sociales - tipo linktr.ee)
-- =============================================
CREATE TABLE enlaces_restaurante (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    titulo NVARCHAR(200) NOT NULL,
    url NVARCHAR(500) NOT NULL,
    icono_url NVARCHAR(500), -- Icono personalizado
    tipo_icono NVARCHAR(50), -- facebook, instagram, whatsapp, custom, etc.
    orden_visualizacion INT DEFAULT 0,
    activo BIT DEFAULT 1,
    contador_clics INT DEFAULT 0,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    INDEX IX_enlaces_restaurante_restaurante_id (restaurante_id),
    INDEX IX_enlaces_restaurante_orden_visualizacion (orden_visualizacion)
);

-- =============================================
-- TABLA: usuarios (Usuarios del sistema)
-- =============================================
CREATE TABLE usuarios (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    correo NVARCHAR(255) NOT NULL UNIQUE,
    hash_contrasena NVARCHAR(255) NOT NULL,
    nombre NVARCHAR(100),
    apellido NVARCHAR(100),
    telefono NVARCHAR(50),
    avatar_url NVARCHAR(500),
    
    -- Relación con restaurante
    restaurante_id UNIQUEIDENTIFIER NULL, -- NULL para super admin
    
    -- Autenticación
    correo_verificado BIT DEFAULT 0,
    token_verificacion_correo NVARCHAR(255),
    token_reset_contrasena NVARCHAR(255),
    fecha_expiracion_reset DATETIME2,
    
    -- Estado
    activo BIT DEFAULT 1,
    ultimo_acceso DATETIME2,
    
    -- Metadatos
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    fecha_eliminacion DATETIME2 NULL,
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE SET NULL,
    INDEX IX_usuarios_correo (correo),
    INDEX IX_usuarios_restaurante_id (restaurante_id)
);

-- =============================================
-- TABLA: roles (Roles del sistema)
-- =============================================
CREATE TABLE roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(50) NOT NULL UNIQUE, -- super_admin, admin, mesero, cocina
    descripcion NVARCHAR(255),
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE()
);

-- =============================================
-- TABLA: permisos (Permisos del sistema)
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

-- =============================================
-- TABLA: roles_permisos (Relación muchos a muchos entre roles y permisos)
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

-- Datos iniciales de permisos
IF NOT EXISTS (SELECT * FROM permisos WHERE codigo = '*')
BEGIN
    INSERT INTO permisos (codigo, nombre, descripcion, modulo) VALUES
    ('*', 'Todos los permisos', 'Permiso especial que otorga acceso completo al sistema', 'sistema'),
    ('restaurant.*', 'Gestión completa de restaurante', 'Todos los permisos relacionados con restaurantes', 'restaurant'),
    ('menu.*', 'Gestión completa de menú', 'Todos los permisos relacionados con menús y categorías', 'menu'),
    ('users.*', 'Gestión completa de usuarios', 'Todos los permisos relacionados con usuarios', 'users'),
    ('orders.view', 'Ver pedidos', 'Permiso para visualizar pedidos', 'orders'),
    ('orders.update_status', 'Actualizar estado de pedidos', 'Permiso para cambiar el estado de los pedidos', 'orders'),
    ('tables.view', 'Ver mesas', 'Permiso para visualizar mesas', 'tables');
END;
GO

-- Datos iniciales de roles
IF NOT EXISTS (SELECT * FROM roles WHERE nombre = 'SuperAdministrador')
BEGIN
    INSERT INTO roles (nombre, descripcion) VALUES
    ('SuperAdministrador', 'Administrador de la plataforma'),
    ('Administrador', 'Administrador del restaurante'),
    ('Mesero', 'Mesero del restaurante'),
    ('Cocina', 'Personal de cocina');
END;
GO

-- Asignar permisos a roles (SuperAdministrador tiene todos los permisos)
IF NOT EXISTS (SELECT * FROM roles_permisos rp
               INNER JOIN roles r ON rp.rol_id = r.id
               INNER JOIN permisos p ON rp.permiso_id = p.id
               WHERE r.nombre = 'SuperAdministrador' AND p.codigo = '*')
BEGIN
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permisos p
    WHERE r.nombre = 'SuperAdministrador'
    AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id);
END;
GO

-- Asignar permisos a Administrador
IF NOT EXISTS (SELECT * FROM roles_permisos rp
               INNER JOIN roles r ON rp.rol_id = r.id
               INNER JOIN permisos p ON rp.permiso_id = p.id
               WHERE r.nombre = 'Administrador' AND p.codigo = 'restaurant.*')
BEGIN
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permisos p
    WHERE r.nombre = 'Administrador'
    AND p.codigo IN ('restaurant.*', 'menu.*', 'users.*', 'orders.view')
    AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id);
END;
GO

-- Asignar permisos a Mesero
IF NOT EXISTS (SELECT * FROM roles_permisos rp
               INNER JOIN roles r ON rp.rol_id = r.id
               INNER JOIN permisos p ON rp.permiso_id = p.id
               WHERE r.nombre = 'Mesero' AND p.codigo = 'orders.view')
BEGIN
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permisos p
    WHERE r.nombre = 'Mesero'
    AND p.codigo IN ('orders.view', 'orders.update_status', 'tables.view')
    AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id);
END;
GO

-- Asignar permisos a Cocina
IF NOT EXISTS (SELECT * FROM roles_permisos rp
               INNER JOIN roles r ON rp.rol_id = r.id
               INNER JOIN permisos p ON rp.permiso_id = p.id
               WHERE r.nombre = 'Cocina' AND p.codigo = 'orders.view')
BEGIN
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permisos p
    WHERE r.nombre = 'Cocina'
    AND p.codigo IN ('orders.view', 'orders.update_status')
    AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id);
END;
GO

-- =============================================
-- TABLA: roles_usuario (Relación muchos a muchos)
-- =============================================
CREATE TABLE roles_usuario (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    usuario_id UNIQUEIDENTIFIER NOT NULL,
    rol_id UNIQUEIDENTIFIER NOT NULL,
    restaurante_id UNIQUEIDENTIFIER NULL, -- NULL para roles globales (super_admin)
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    
    UNIQUE (usuario_id, rol_id, restaurante_id),
    INDEX IX_roles_usuario_usuario_id (usuario_id),
    INDEX IX_roles_usuario_rol_id (rol_id),
    INDEX IX_roles_usuario_restaurante_id (restaurante_id)
);

-- =============================================
-- TABLA: mesas (Mesas del restaurante)
-- =============================================
CREATE TABLE mesas (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    numero NVARCHAR(20) NOT NULL,
    nombre NVARCHAR(100), -- Nombre opcional de la mesa
    codigo_qr NVARCHAR(500), -- URL del QR code
    imagen_qr_url NVARCHAR(500), -- Imagen del QR generada
    
    -- Configuración
    capacidad INT DEFAULT 4,
    activa BIT DEFAULT 1,
    ocupada BIT DEFAULT 0,
    
    -- Ubicación/sección
    seccion NVARCHAR(100), -- Interior, Terraza, Bar, etc.
    piso INT DEFAULT 1,
    
    -- Asignación de mesero
    mesero_asignado_id UNIQUEIDENTIFIER NULL,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    FOREIGN KEY (mesero_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    UNIQUE (restaurante_id, numero),
    INDEX IX_mesas_restaurante_id (restaurante_id),
    INDEX IX_mesas_ocupada (ocupada)
);

-- =============================================
-- TABLA: categorias (Categorías de platos)
-- =============================================
CREATE TABLE categorias (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    descripcion NVARCHAR(500),
    imagen_url NVARCHAR(500),
    orden_visualizacion INT DEFAULT 0,
    activa BIT DEFAULT 1,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    INDEX IX_categorias_restaurante_id (restaurante_id),
    INDEX IX_categorias_orden_visualizacion (orden_visualizacion)
);

-- =============================================
-- TABLA: items_menu (Platos del menú)
-- =============================================
CREATE TABLE items_menu (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    categoria_id UNIQUEIDENTIFIER NOT NULL,
    
    nombre NVARCHAR(200) NOT NULL,
    descripcion NVARCHAR(1000),
    precio DECIMAL(10, 2) NOT NULL,
    imagen_url NVARCHAR(500),
    
    -- Información nutricional (opcional)
    calorias INT,
    alergenos NVARCHAR(500), -- JSON array
    
    -- Configuración
    disponible BIT DEFAULT 1,
    destacado BIT DEFAULT 0, -- Destacar en la página
    orden_visualizacion INT DEFAULT 0,
    
    -- Tiempos y características
    tiempo_preparacion INT, -- Minutos
    es_vegetariano BIT DEFAULT 0,
    es_vegano BIT DEFAULT 0,
    sin_gluten BIT DEFAULT 0,
    es_picante BIT DEFAULT 0,
    nivel_picante INT DEFAULT 0, -- 0-5
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    fecha_eliminacion DATETIME2 NULL,
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE NO ACTION,
    
    INDEX IX_items_menu_restaurante_id (restaurante_id),
    INDEX IX_items_menu_categoria_id (categoria_id),
    INDEX IX_items_menu_disponible (disponible),
    INDEX IX_items_menu_orden_visualizacion (orden_visualizacion)
);

-- =============================================
-- TABLA: adiciones (Adiciones/Extras para platos)
-- =============================================
CREATE TABLE adiciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    descripcion NVARCHAR(500),
    precio DECIMAL(10, 2) DEFAULT 0,
    es_obligatorio BIT DEFAULT 0, -- Si es obligatorio seleccionar una opción
    maximo_selecciones INT DEFAULT 1, -- Máximo de selecciones
    orden_visualizacion INT DEFAULT 0,
    activa BIT DEFAULT 1,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    INDEX IX_adiciones_restaurante_id (restaurante_id)
);

-- =============================================
-- TABLA: opciones_adiciones (Opciones de adiciones)
-- =============================================
CREATE TABLE opciones_adiciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    adicion_id UNIQUEIDENTIFIER NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    modificador_precio DECIMAL(10, 2) DEFAULT 0, -- Incremento/descuento
    es_predeterminada BIT DEFAULT 0,
    orden_visualizacion INT DEFAULT 0,
    activa BIT DEFAULT 1,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (adicion_id) REFERENCES adiciones(id) ON DELETE CASCADE,
    INDEX IX_opciones_adiciones_adicion_id (adicion_id)
);

-- =============================================
-- TABLA: items_menu_adiciones (Relación platos con adiciones)
-- =============================================
CREATE TABLE items_menu_adiciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_menu_id UNIQUEIDENTIFIER NOT NULL,
    adicion_id UNIQUEIDENTIFIER NOT NULL,
    
    FOREIGN KEY (item_menu_id) REFERENCES items_menu(id) ON DELETE CASCADE,
    FOREIGN KEY (adicion_id) REFERENCES adiciones(id) ON DELETE NO ACTION,
    
    UNIQUE (item_menu_id, adicion_id),
    INDEX IX_items_menu_adiciones_item_menu_id (item_menu_id),
    INDEX IX_items_menu_adiciones_adicion_id (adicion_id)
);

-- =============================================
-- TABLA: pedidos (Pedidos)
-- =============================================
CREATE TABLE pedidos (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    mesa_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Información del cliente
    nombre_cliente NVARCHAR(200),
    telefono_cliente NVARCHAR(50),
    correo_cliente NVARCHAR(255),
    
    -- Estado del pedido
    estado NVARCHAR(50) DEFAULT 'pendiente', -- pendiente, pendiente_confirmacion, confirmado, preparando, listo, servido, completado, cancelado
    monto_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Notas y observaciones
    notas NVARCHAR(1000),
    instrucciones_especiales NVARCHAR(1000),
    
    -- Asignación
    mesero_asignado_id UNIQUEIDENTIFIER NULL,
    
    -- Tiempos
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_confirmacion DATETIME2,
    fecha_preparacion DATETIME2,
    fecha_listo DATETIME2,
    fecha_servido DATETIME2,
    fecha_completado DATETIME2,
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE NO ACTION,
    FOREIGN KEY (mesero_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX IX_pedidos_restaurante_id (restaurante_id),
    INDEX IX_pedidos_mesa_id (mesa_id),
    INDEX IX_pedidos_estado (estado),
    INDEX IX_pedidos_fecha_creacion (fecha_creacion)
);

-- =============================================
-- TABLA: items_pedido (Items del pedido)
-- =============================================
CREATE TABLE items_pedido (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    pedido_id UNIQUEIDENTIFIER NOT NULL,
    item_menu_id UNIQUEIDENTIFIER NOT NULL,
    
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL, -- Precio al momento del pedido
    subtotal DECIMAL(10, 2) NOT NULL, -- cantidad * precio_unitario + adiciones
    
    -- Estado individual
    estado NVARCHAR(50) DEFAULT 'pendiente', -- pendiente, preparando, listo, servido, cancelado
    
    -- Notas específicas del item
    notas NVARCHAR(500),
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (item_menu_id) REFERENCES items_menu(id) ON DELETE NO ACTION,
    
    INDEX IX_items_pedido_pedido_id (pedido_id),
    INDEX IX_items_pedido_estado (estado)
);

-- =============================================
-- TABLA: items_pedido_adiciones (Adiciones seleccionadas)
-- =============================================
CREATE TABLE items_pedido_adiciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    item_pedido_id UNIQUEIDENTIFIER NOT NULL,
    adicion_id UNIQUEIDENTIFIER NOT NULL,
    opcion_adicion_id UNIQUEIDENTIFIER NOT NULL,
    modificador_precio DECIMAL(10, 2) DEFAULT 0,
    
    FOREIGN KEY (item_pedido_id) REFERENCES items_pedido(id) ON DELETE CASCADE,
    FOREIGN KEY (adicion_id) REFERENCES adiciones(id) ON DELETE NO ACTION,
    FOREIGN KEY (opcion_adicion_id) REFERENCES opciones_adiciones(id) ON DELETE NO ACTION,
    
    INDEX IX_items_pedido_adiciones_item_pedido_id (item_pedido_id)
);

-- =============================================
-- TABLA: historial_estado_pedido (Historial de cambios de estado)
-- =============================================
CREATE TABLE historial_estado_pedido (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    pedido_id UNIQUEIDENTIFIER NOT NULL,
    item_pedido_id UNIQUEIDENTIFIER NULL, -- NULL si es cambio de estado del pedido completo
    
    estado_anterior NVARCHAR(50),
    estado_nuevo NVARCHAR(50) NOT NULL,
    cambiado_por_id UNIQUEIDENTIFIER NULL, -- Usuario que hizo el cambio
    notas NVARCHAR(500),
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (item_pedido_id) REFERENCES items_pedido(id) ON DELETE NO ACTION,
    FOREIGN KEY (cambiado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX IX_historial_estado_pedido_pedido_id (pedido_id),
    INDEX IX_historial_estado_pedido_item_pedido_id (item_pedido_id),
    INDEX IX_historial_estado_pedido_fecha_creacion (fecha_creacion)
);

-- =============================================
-- TABLA: suscripciones (Suscripciones de restaurantes)
-- =============================================
CREATE TABLE suscripciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
    
    tipo_plan NVARCHAR(50) NOT NULL, -- trial, basic, premium, enterprise
    estado NVARCHAR(50) NOT NULL, -- active, cancelled, past_due, trialing
    
    -- Información de facturación
    stripe_subscription_id NVARCHAR(255),
    stripe_customer_id NVARCHAR(255),
    
    -- Período
    inicio_periodo_actual DATETIME2,
    fin_periodo_actual DATETIME2,
    
    -- Cancelación
    cancelar_al_fin_periodo BIT DEFAULT 0,
    fecha_cancelacion DATETIME2,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    fecha_actualizacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    INDEX IX_suscripciones_restaurante_id (restaurante_id),
    INDEX IX_suscripciones_estado (estado)
);

-- =============================================
-- TABLA: pagos (Pagos y transacciones)
-- =============================================
CREATE TABLE pagos (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    suscripcion_id UNIQUEIDENTIFIER NOT NULL,
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    
    monto DECIMAL(10, 2) NOT NULL,
    moneda NVARCHAR(3) DEFAULT 'USD',
    
    -- Información de Stripe
    stripe_payment_intent_id NVARCHAR(255),
    stripe_invoice_id NVARCHAR(255),
    
    estado NVARCHAR(50) NOT NULL, -- pendiente, exitoso, fallido, reembolsado
    
    -- Fechas
    fecha_pago DATETIME2,
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE NO ACTION,
    
    INDEX IX_pagos_suscripcion_id (suscripcion_id),
    INDEX IX_pagos_restaurante_id (restaurante_id),
    INDEX IX_pagos_estado (estado)
);

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

-- =============================================
-- TABLA: notificaciones (Notificaciones)
-- =============================================
CREATE TABLE notificaciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NULL, -- NULL para notificaciones globales
    usuario_id UNIQUEIDENTIFIER NULL, -- NULL para notificaciones a todos los usuarios del restaurante
    
    tipo NVARCHAR(50) NOT NULL, -- pedido_nuevo, estado_pedido_cambiado, pago_recibido, etc.
    titulo NVARCHAR(200) NOT NULL,
    mensaje NVARCHAR(1000) NOT NULL,
    
    -- Metadata
    datos NVARCHAR(MAX), -- JSON con datos adicionales
    referencia_id UNIQUEIDENTIFIER, -- ID de la entidad relacionada (pedido_id, etc.)
    
    -- Estado
    leida BIT DEFAULT 0,
    fecha_lectura DATETIME2,
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    INDEX IX_notificaciones_restaurante_id (restaurante_id),
    INDEX IX_notificaciones_usuario_id (usuario_id),
    INDEX IX_notificaciones_leida (leida),
    INDEX IX_notificaciones_fecha_creacion (fecha_creacion)
);

-- =============================================
-- TABLA: analiticas (Analytics y métricas)
-- =============================================
CREATE TABLE analiticas (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    restaurante_id UNIQUEIDENTIFIER NOT NULL,
    
    tipo_evento NVARCHAR(50) NOT NULL, -- vista_pagina, vista_menu, pedido_realizado, click_enlace, etc.
    datos_evento NVARCHAR(MAX), -- JSON con datos del evento
    
    -- Información del usuario/cliente
    id_sesion NVARCHAR(255),
    agente_usuario NVARCHAR(500),
    direccion_ip NVARCHAR(50),
    
    fecha_creacion DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
    
    INDEX IX_analiticas_restaurante_id (restaurante_id),
    INDEX IX_analiticas_tipo_evento (tipo_evento),
    INDEX IX_analiticas_fecha_creacion (fecha_creacion)
);

-- =============================================
-- TABLA: logs_sistema (Logs y Auditoría del Sistema)
-- =============================================
CREATE TABLE logs_sistema (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    
    -- Contexto
    restaurante_id UNIQUEIDENTIFIER NULL, -- NULL para logs globales del sistema
    usuario_id UNIQUEIDENTIFIER NULL, -- Usuario que generó el log (NULL para acciones automáticas)
    
    -- Tipo y nivel de log
    nivel NVARCHAR(20) NOT NULL, -- ERROR, WARN, INFO, DEBUG
    categoria NVARCHAR(50) NOT NULL, -- autenticacion, autorizacion, api, base_datos, negocio, sistema, seguridad
    
    -- Mensaje y detalles
    mensaje NVARCHAR(1000) NOT NULL,
    detalle NVARCHAR(MAX), -- JSON con detalles adicionales
    stack_trace NVARCHAR(MAX), -- Para errores con stack trace
    
    -- Información de la solicitud
    metodo_http NVARCHAR(10), -- GET, POST, PUT, DELETE
    ruta NVARCHAR(500), -- /api/restaurantes/123
    endpoint NVARCHAR(200), -- nombre del endpoint o controlador
    
    -- Información del cliente/servidor
    direccion_ip NVARCHAR(50),
    agente_usuario NVARCHAR(500),
    id_sesion NVARCHAR(255),
    
    -- Referencias a entidades
    entidad_tipo NVARCHAR(50), -- restaurante, pedido, usuario, etc.
    entidad_id UNIQUEIDENTIFIER, -- ID de la entidad relacionada
    
    -- Tiempo de ejecución (para operaciones)
    tiempo_ejecucion_ms INT, -- Tiempo de ejecución en milisegundos
    
    -- Estado y código
    codigo_estado_http INT, -- 200, 404, 500, etc.
    codigo_error NVARCHAR(50), -- Código de error interno
    
    -- Metadata adicional
    metadata NVARCHAR(MAX), -- JSON con metadata adicional
    
    fecha_creacion DATETIME2 DEFAULT SYSUTCDATETIME(), -- UTC para consistencia multi-zona horaria
    
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX IX_logs_sistema_restaurante_id (restaurante_id),
    INDEX IX_logs_sistema_usuario_id (usuario_id),
    INDEX IX_logs_sistema_nivel (nivel),
    INDEX IX_logs_sistema_categoria (categoria),
    INDEX IX_logs_sistema_fecha_creacion (fecha_creacion),
    INDEX IX_logs_sistema_entidad (entidad_tipo, entidad_id)
);

-- =============================================
-- Triggers para fecha_actualizacion
-- =============================================

-- Trigger para restaurantes
CREATE TRIGGER tr_restaurantes_fecha_actualizacion
ON restaurantes
AFTER UPDATE
AS
BEGIN
    UPDATE restaurantes
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE restaurantes.id = inserted.id;
END;

-- Trigger para enlaces_restaurante
CREATE TRIGGER tr_enlaces_restaurante_fecha_actualizacion
ON enlaces_restaurante
AFTER UPDATE
AS
BEGIN
    UPDATE enlaces_restaurante
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE enlaces_restaurante.id = inserted.id;
END;

-- Trigger para usuarios
CREATE TRIGGER tr_usuarios_fecha_actualizacion
ON usuarios
AFTER UPDATE
AS
BEGIN
    UPDATE usuarios
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE usuarios.id = inserted.id;
END;

-- Trigger para roles
CREATE TRIGGER tr_roles_fecha_actualizacion
ON roles
AFTER UPDATE
AS
BEGIN
    UPDATE roles
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE roles.id = inserted.id;
END;

-- Trigger para permisos
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

-- Trigger para mesas
CREATE TRIGGER tr_mesas_fecha_actualizacion
ON mesas
AFTER UPDATE
AS
BEGIN
    UPDATE mesas
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE mesas.id = inserted.id;
END;

-- Trigger para categorias
CREATE TRIGGER tr_categorias_fecha_actualizacion
ON categorias
AFTER UPDATE
AS
BEGIN
    UPDATE categorias
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE categorias.id = inserted.id;
END;

-- Trigger para items_menu
CREATE TRIGGER tr_items_menu_fecha_actualizacion
ON items_menu
AFTER UPDATE
AS
BEGIN
    UPDATE items_menu
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE items_menu.id = inserted.id;
END;

-- Trigger para adiciones
CREATE TRIGGER tr_adiciones_fecha_actualizacion
ON adiciones
AFTER UPDATE
AS
BEGIN
    UPDATE adiciones
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE adiciones.id = inserted.id;
END;

-- Trigger para items_pedido
CREATE TRIGGER tr_items_pedido_fecha_actualizacion
ON items_pedido
AFTER UPDATE
AS
BEGIN
    UPDATE items_pedido
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE items_pedido.id = inserted.id;
END;

-- Trigger para suscripciones
CREATE TRIGGER tr_suscripciones_fecha_actualizacion
ON suscripciones
AFTER UPDATE
AS
BEGIN
    UPDATE suscripciones
    SET fecha_actualizacion = GETDATE()
    FROM inserted
    WHERE suscripciones.id = inserted.id;
END;

-- Trigger para configuracion_reservas
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

-- Trigger para reservas
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

-- =============================================
-- Vistas útiles
-- =============================================

-- Vista de pedidos activos con información completa
CREATE VIEW v_pedidos_activos AS
SELECT 
    p.id,
    p.restaurante_id,
    r.nombre AS nombre_restaurante,
    p.mesa_id,
    m.numero AS numero_mesa,
    p.estado,
    p.monto_total,
    p.nombre_cliente,
    p.fecha_creacion,
    u.nombre + ' ' + u.apellido AS nombre_mesero
FROM pedidos p
INNER JOIN restaurantes r ON p.restaurante_id = r.id
INNER JOIN mesas m ON p.mesa_id = m.id
LEFT JOIN usuarios u ON p.mesero_asignado_id = u.id
WHERE p.estado NOT IN ('completado', 'cancelado')
    AND r.activo = 1
    AND r.fecha_eliminacion IS NULL;

-- Vista de estadísticas de restaurante
CREATE VIEW v_estadisticas_restaurante AS
SELECT 
    r.id AS restaurante_id,
    r.nombre AS nombre_restaurante,
    COUNT(DISTINCT p.id) AS total_pedidos,
    COUNT(DISTINCT CASE WHEN p.fecha_creacion >= DATEADD(DAY, -30, GETDATE()) THEN p.id END) AS pedidos_ultimos_30_dias,
    SUM(CASE WHEN p.fecha_creacion >= DATEADD(DAY, -30, GETDATE()) THEN p.monto_total ELSE 0 END) AS ingresos_ultimos_30_dias,
    COUNT(DISTINCT m.id) AS total_mesas,
    COUNT(DISTINCT im.id) AS total_items_menu
FROM restaurantes r
LEFT JOIN pedidos p ON r.id = p.restaurante_id
LEFT JOIN mesas m ON r.id = m.restaurante_id
LEFT JOIN items_menu im ON r.id = im.restaurante_id
WHERE r.fecha_eliminacion IS NULL
GROUP BY r.id, r.nombre;

-- =============================================
-- Stored Procedures útiles
-- =============================================

-- SP para crear un nuevo restaurante con usuario admin
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
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Crear restaurante
        SET @RestauranteId = NEWID();
        INSERT INTO restaurantes (id, nombre, slug, correo, activo)
        VALUES (@RestauranteId, @NombreRestaurante, @Slug, @Correo, 1);
        
        -- Crear usuario admin
        SET @UsuarioId = NEWID();
        DECLARE @RolAdminId UNIQUEIDENTIFIER;
        SELECT @RolAdminId = id FROM roles WHERE nombre = 'Administrador';
        
        INSERT INTO usuarios (id, correo, hash_contrasena, nombre, apellido, restaurante_id, correo_verificado, activo)
        VALUES (@UsuarioId, @Correo, @HashContrasena, @NombreAdmin, @ApellidoAdmin, @RestauranteId, 1, 1);
        
        -- Asignar rol admin
        INSERT INTO roles_usuario (id, usuario_id, rol_id, restaurante_id)
        VALUES (NEWID(), @UsuarioId, @RolAdminId, @RestauranteId);
        
        -- Crear suscripción trial
        INSERT INTO suscripciones (id, restaurante_id, tipo_plan, estado, inicio_periodo_actual, fin_periodo_actual)
        VALUES (
            NEWID(),
            @RestauranteId,
            'trial',
            'trialing',
            GETDATE(),
            DATEADD(DAY, 14, GETDATE()) -- 14 días de prueba
        );
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
