# Diagrama de Relaciones - Base de Datos MenuQR

## Relaciones Principales

```
┌─────────────────┐
│  restaurantes   │ (Tenant Principal)
│─────────────────│
│ id (PK)         │
│ nombre          │
│ slug            │──┐
│ correo          │  │
│ ...             │  │
└─────────────────┘  │
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼                             ▼
┌─────────────────┐       ┌─────────────────┐
│ enlaces_restaurante│     │     mesas      │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ restaurante_id(FK)│      │ restaurante_id(FK)│
│ titulo          │       │ numero          │
│ url             │       │ codigo_qr       │
└─────────────────┘       └─────────────────┘
                                  │
                                  │
                                  ▼
                          ┌─────────────────┐
                          │    pedidos      │
                          │─────────────────│
                          │ id (PK)         │
                          │ restaurante_id(FK)│
                          │ mesa_id (FK)    │
                          │ estado          │
                          └─────────────────┘
                                  │
                      ┌───────────┴───────────┐
                      │                       │
                      ▼                       ▼
              ┌───────────────┐     ┌──────────────────────┐
              │ items_pedido  │     │historial_estado_pedido│
              │───────────────│     │──────────────────────│
              │ id (PK)       │     │ id (PK)              │
              │ pedido_id (FK)│     │ pedido_id (FK)       │
              │ item_menu_id  │     │ estado_nuevo         │
              │ cantidad      │     └──────────────────────┘
              └───────────────┘
                      │
                      ▼
              ┌───────────────────────┐
              │items_pedido_adiciones │
              │───────────────────────│
              │ id (PK)               │
              │ item_pedido_id (FK)   │
              │ adicion_id (FK)       │
              └───────────────────────┘

┌─────────────────┐
│  restaurantes   │
└─────────────────┘
      │
      │
      ▼
┌─────────────────┐       ┌─────────────────┐
│   categorias    │       │   items_menu    │
│─────────────────│       │─────────────────│
│ id (PK)         │◄──────┤ id (PK)         │
│ restaurante_id(FK)│      │ restaurante_id(FK)│
│ nombre          │       │ categoria_id (FK)│
└─────────────────┘       │ nombre          │
                          │ precio          │
                          └─────────────────┘
                                  │
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌──────────────────┐       ┌─────────────────────┐
          │ adiciones        │       │items_menu_adiciones │
          │──────────────────│       │─────────────────────│
          │ id (PK)          │◄──────┤ adicion_id (FK)     │
          │ restaurante_id(FK)│       │ item_menu_id (FK)   │
          │ nombre           │       └─────────────────────┘
          └──────────────────┘
                  │
                  ▼
          ┌──────────────────┐
          │ opciones_adiciones│
          │──────────────────│
          │ id (PK)          │
          │ adicion_id (FK)  │
          │ nombre           │
          │ modificador_precio│
          └──────────────────┘

┌─────────────────┐
│  restaurantes   │
└─────────────────┘
      │
      │
      ▼
┌─────────────────┐       ┌─────────────────┐
│    usuarios     │       │ suscripciones   │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ restaurante_id(FK)│      │ restaurante_id(FK)│
│ correo          │       │ tipo_plan       │
│ hash_contrasena │       │ estado          │
└─────────────────┘       └─────────────────┘
      │                           │
      │                           │
      ▼                           ▼
┌─────────────────┐       ┌─────────────────┐
│  roles_usuario  │       │     pagos       │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ usuario_id (FK) │       │ suscripcion_id  │
│ rol_id (FK)     │       │ monto           │
│ restaurante_id  │       │ estado          │
└─────────────────┘       └─────────────────┘
      │
      │
      ▼
┌─────────────────┐
│     roles       │
│─────────────────│
│ id (PK)         │
│ nombre          │
│ permisos        │
└─────────────────┘

┌─────────────────┐
│  restaurantes   │
└─────────────────┘
      │
      ├──────────────────┐
      │                  │
      ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ notificaciones  │  │   analiticas    │
│─────────────────│  │─────────────────│
│ id (PK)         │  │ id (PK)         │
│ restaurante_id(FK)│  │ restaurante_id(FK)│
│ usuario_id (FK) │  │ tipo_evento     │
│ tipo            │  │ datos_evento    │
│ mensaje         │  └─────────────────┘
└─────────────────┘
```

## Descripción de Relaciones

### Restaurantes (Core)
- **restaurantes** es la tabla principal (tenant)
- Se relaciona con todas las demás tablas vía `restaurante_id`

### Usuarios y Roles
- Un usuario puede tener múltiples roles (`roles_usuario`)
- Los roles pueden ser globales (super_admin) o por restaurante
- Un usuario pertenece a un restaurante (o NULL para super_admin)

### Menú
- Los restaurantes tienen categorías
- Las categorías tienen items del menú
- Los items pueden tener múltiples adiciones
- Las adiciones tienen opciones (ej: "Tamaño: Pequeño, Mediano, Grande")

### Pedidos
- Un pedido pertenece a un restaurante y una mesa
- Un pedido tiene múltiples items
- Cada item puede tener adiciones seleccionadas
- Se mantiene historial de cambios de estado

### Perfil Público (Linktr.ee)
- Los restaurantes tienen links personalizables
- Cada link tiene orden de visualización
- Se rastrea clicks en los links

### Facturación
- Cada restaurante tiene una suscripción
- Las suscripciones tienen múltiples pagos
- Se integra con Stripe

### Sistema
- Notificaciones para usuarios o restaurantes
- Analytics para tracking de eventos
- Todo relacionado con restaurantes para multi-tenancy

## Cardinalidades

- restaurantes (1) ──→ (N) enlaces_restaurante
- restaurantes (1) ──→ (N) mesas
- restaurantes (1) ──→ (N) categorias
- restaurantes (1) ──→ (N) items_menu
- restaurantes (1) ──→ (N) usuarios
- restaurantes (1) ──→ (1) suscripciones
- mesas (1) ──→ (N) pedidos
- pedidos (1) ──→ (N) items_pedido
- items_menu (N) ──→ (N) adiciones (vía items_menu_adiciones)
- adiciones (1) ──→ (N) opciones_adiciones
- usuarios (N) ──→ (N) roles (vía roles_usuario)
- suscripciones (1) ──→ (N) pagos
