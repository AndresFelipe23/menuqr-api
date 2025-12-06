# 🔥 Configuración de Firebase Storage para MenuQR

## Reglas de Seguridad

Las reglas de Firebase Storage han sido configuradas para el proyecto MenuQR. 

### Estructura de Carpetas

```
MenuQR/
  └── {restaurante_id}/
      ├── imagenes/          # Imágenes generales (default)
      ├── items/            # Imágenes de items del menú
      ├── categorias/       # Imágenes de categorías
      ├── perfil/           # Foto de perfil del restaurante
      └── portada/          # Imagen de portada del restaurante
```

### Reglas Aplicadas

```javascript
match /MenuQR/{restauranteId}/{allPaths=**} {
  // Permitir lectura pública (clientes pueden ver imágenes del menú sin autenticación)
  allow read: if true;
  
  // La escritura se hace desde el backend usando Admin SDK
  // No se necesita regla de escritura aquí porque el Admin SDK bypass las reglas
  // Pero por seguridad, denegamos escritura desde el cliente
  allow write: if false;
}
```

### Explicación de las Reglas

1. **Lectura pública (`allow read: if true`)**: 
   - Los clientes necesitan ver las imágenes del menú sin autenticación
   - Esto permite que cualquiera pueda acceder a las imágenes públicas del menú
   - Es necesario para que los clientes vean los platos, categorías, etc.

2. **Escritura denegada (`allow write: if false`)**:
   - La escritura se hace exclusivamente desde el backend usando Firebase Admin SDK
   - El Admin SDK bypass las reglas de seguridad, por lo que puede escribir sin problemas
   - Esto previene que usuarios maliciosos suban archivos directamente desde el cliente

### Cómo Aplicar las Reglas

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `proyectnexus-b060b`
3. Ve a **Storage** → **Rules**
4. Copia el contenido del archivo `FIREBASE_STORAGE_RULES.txt`
5. Pega las reglas en el editor
6. Haz clic en **Publish**

### Verificación

Después de aplicar las reglas, puedes verificar que funcionan:

1. **Lectura pública**: Intenta acceder a una URL de imagen directamente en el navegador
   ```
   https://firebasestorage.googleapis.com/v0/b/proyectnexus-b060b.firebasestorage.app/o/MenuQR%2F{restaurante_id}%2Fitems%2F{filename}?alt=media
   ```
   Debe cargar la imagen sin autenticación.

2. **Escritura desde backend**: Sube una imagen usando el endpoint `/api/storage/upload`
   - Debe funcionar correctamente con un token válido
   - El archivo debe aparecer en Firebase Storage

### Seguridad Adicional

Aunque las reglas permiten lectura pública, el backend implementa:

- ✅ Autenticación requerida para subir/eliminar archivos
- ✅ Validación de que el usuario solo puede subir a su restaurante
- ✅ Validación de tipo de archivo (solo imágenes)
- ✅ Validación de tamaño (máximo 5MB)
- ✅ Aislamiento por restaurante (cada restaurante solo ve sus archivos)

### Troubleshooting

**Error: "Permission denied" al leer imágenes**
- Verifica que las reglas estén publicadas correctamente
- Verifica que la ruta del archivo sea correcta: `MenuQR/{restaurante_id}/...`

**Error: "Permission denied" al subir desde backend**
- El backend usa Admin SDK, no debería tener problemas
- Verifica que el archivo de credenciales sea correcto
- Verifica que Firebase esté inicializado correctamente

**Las imágenes no se muestran en el frontend**
- Verifica que la URL sea correcta
- Verifica que el archivo exista en Firebase Storage
- Verifica las reglas de lectura pública

