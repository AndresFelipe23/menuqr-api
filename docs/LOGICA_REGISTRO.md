# Lógica de Registro Multi-Tenant

## 📋 Descripción

El sistema utiliza una lógica multi-tenant donde cada restaurante es un tenant independiente. El registro funciona de dos formas:

## 🎯 Casos de Uso

### 1. Registro Público (Nuevo Restaurante)

Cuando alguien se registra públicamente sin un `restauranteId`:

- ✅ Crea un **nuevo restaurante** con los datos proporcionados
- ✅ Crea el **usuario** con el email y contraseña
- ✅ Asigna automáticamente el rol **"Administrador"** al usuario para ese restaurante
- ✅ El usuario queda como **propietario/administrador** de su restaurante

**Campos requeridos:**
```json
{
  "email": "contacto@mirestaurante.com",
  "password": "password123",
  "nombre": "Juan Pérez",
  "nombreRestaurante": "Mi Restaurante",
  "slugRestaurante": "mi-restaurante"
}
```

**Validaciones:**
- El slug del restaurante debe ser único
- El email no puede estar registrado como usuario ni como restaurante
- El slug solo puede contener letras minúsculas, números y guiones

### 2. Registro por Administrador (Usuario en Restaurante Existente)

Cuando un administrador crea usuarios para su restaurante:

- ✅ Crea solo el **usuario** asociado al restaurante
- ✅ Asigna el **rol especificado** (o ninguno si no se especifica)
- ✅ No crea restaurante nuevo

**Campos requeridos:**
```json
{
  "email": "mesero@mirestaurante.com",
  "password": "password123",
  "nombre": "María García",
  "restauranteId": "uuid-del-restaurante",
  "rolId": "uuid-del-rol" // opcional: Mesero, Cocina, etc.
}
```

## 🔐 Roles del Sistema

Los roles disponibles son:

1. **SuperAdministrador**: Administrador de la plataforma (creado manualmente)
2. **Administrador**: Administrador del restaurante (asignado automáticamente en registro público)
3. **Mesero**: Personal de servicio
4. **Cocina**: Personal de cocina

## 📊 Flujo de Registro

```
Registro Público:
┌─────────────────┐
│  Usuario nuevo  │
│  (sin tenant)   │
└────────┬────────┘
         │
         ├─> Validar email único
         ├─> Validar slug único
         │
         ├─> Crear Restaurante
         │   ├─> nombreRestaurante
         │   ├─> slugRestaurante
         │   └─> correo = email
         │
         ├─> Crear Usuario
         │   ├─> email
         │   ├─> nombre
         │   └─> restaurante_id
         │
         └─> Asignar Rol
             └─> "Administrador" del restaurante

Registro por Admin:
┌─────────────────┐
│  Admin crea     │
│  usuario        │
└────────┬────────┘
         │
         ├─> Validar restauranteId existe
         ├─> Validar email único
         │
         ├─> Crear Usuario
         │   ├─> email
         │   ├─> nombre
         │   └─> restaurante_id
         │
         └─> Asignar Rol (opcional)
             └─> rolId especificado
```

## 🔒 Seguridad

- ✅ No se puede crear un usuario con rol "SuperAdministrador" mediante registro público
- ✅ Solo los super administradores pueden crear usuarios sin restaurante
- ✅ Los administradores solo pueden crear usuarios para su propio restaurante
- ✅ El slug del restaurante se valida para evitar duplicados
- ✅ El email se valida para evitar duplicados en usuarios y restaurantes

## 💡 Ejemplos de Uso

### Frontend - Registro de Nuevo Restaurante

```typescript
import { authService } from './services/auth.service';

const nuevoRestaurante = await authService.register({
  email: 'contacto@mirestaurante.com',
  password: 'password123',
  nombre: 'Juan Pérez',
  nombreRestaurante: 'Mi Restaurante',
  slugRestaurante: 'mi-restaurante'
});

// El usuario queda autenticado como Administrador
console.log(nuevoRestaurante.user.rolNombre); // "Administrador"
console.log(nuevoRestaurante.user.restauranteId); // ID del restaurante creado
```

### Frontend - Admin crea Usuario

```typescript
const nuevoUsuario = await authService.register({
  email: 'mesero@mirestaurante.com',
  password: 'password123',
  nombre: 'María García',
  restauranteId: 'mi-restaurante-id',
  rolId: 'rol-mesero-id'
});
```

## 📝 Notas Importantes

1. **El slug es único**: Una vez creado un restaurante con un slug, no se puede usar ese slug en otro restaurante
2. **El email es único**: No puede estar registrado como usuario ni como correo de restaurante
3. **Rol por defecto**: En registro público, siempre se asigna "Administrador"
4. **Estado del restaurante**: Los restaurantes nuevos se crean con `estado_suscripcion = 'trial'`
5. **Activación**: Usuarios y restaurantes se crean activos por defecto

