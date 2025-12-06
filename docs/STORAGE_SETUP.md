# Configuración de Google Cloud Storage

Este proyecto utiliza Google Cloud Storage para almacenar imágenes subidas por los administradores.

## Requisitos Previos

1. Tener una cuenta de Google Cloud Platform
2. Crear un proyecto en GCP
3. Habilitar la API de Cloud Storage
4. Crear un bucket llamado `restaurante-qr` (o el nombre que configures)
5. Crear una cuenta de servicio con permisos de Storage Admin

## Configuración

### Opción 1: Archivo de Credenciales JSON (Recomendado)

1. Descarga el archivo JSON de credenciales de tu cuenta de servicio desde Google Cloud Console
2. Guárdalo en una ubicación segura (NO lo subas al repositorio)
3. Configura la variable de entorno:

```bash
GOOGLE_APPLICATION_CREDENTIALS=path/to/tu-service-account-key.json
```

### Opción 2: Variables de Entorno Individuales

Si prefieres no usar un archivo JSON, puedes configurar las credenciales mediante variables de entorno:

```bash
GCS_PROJECT_ID=tu-project-id
GCS_CLIENT_EMAIL=tu-service-account@tu-project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Nota:** El `GCS_PRIVATE_KEY` debe incluir los saltos de línea como `\n` en la cadena.

### Configuración del Bucket

```bash
GCS_BUCKET_NAME=restaurante-qr
```

Si no se especifica, se usará `restaurante-qr` por defecto.

## Instalación de Dependencias

```bash
bun install
```

O si usas npm:

```bash
npm install
```

## Estructura de Carpetas en el Bucket

Las imágenes se organizan en las siguientes carpetas:

- `restaurantes/perfil/` - Imágenes de perfil de restaurantes
- `restaurantes/portada/` - Imágenes de portada de restaurantes
- `items-menu/` - Imágenes de platos/items del menú
- `categorias/` - Imágenes de categorías
- `mesas/` - Imágenes de códigos QR de mesas
- `uploads/` - Cargas generales

## Permisos del Bucket

Asegúrate de que el bucket tenga los siguientes permisos:

1. **Permisos de la cuenta de servicio:**
   - Storage Admin (para subir y eliminar archivos)

2. **Permisos públicos (opcional):**
   - Si quieres que las imágenes sean accesibles públicamente, configura el bucket para acceso público de lectura
   - O usa `makePublic: true` en el código (ya está configurado por defecto)

## Pruebas

Para probar la configuración, puedes usar el endpoint:

```
POST /api/storage/upload
Content-Type: multipart/form-data
Body: image (file)
Query: folder (opcional)
```

## Solución de Problemas

### Error: "Cannot find module '@google-cloud/storage'"
- Ejecuta `bun install` o `npm install` para instalar las dependencias

### Error: "Permission denied"
- Verifica que la cuenta de servicio tenga permisos de Storage Admin
- Verifica que las credenciales sean correctas

### Error: "Bucket not found"
- Verifica que el bucket `restaurante-qr` exista en tu proyecto de GCP
- Verifica que el nombre del bucket en `GCS_BUCKET_NAME` sea correcto

