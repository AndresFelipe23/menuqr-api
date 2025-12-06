import { BaseController } from './base.controller';
import { StorageService } from '../services/storage.service';
import { AuthenticatedRequest } from '../types/express.types';

export class StorageController extends BaseController {
  private storageService = new StorageService();

  /**
   * Sube una imagen a Firebase Storage
   * Estructura: MenuQR/{restaurante_id}/{subfolder}/{filename}
   */
  public uploadImage = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return this.responseUtil.error(res, 'No se proporcionó ningún archivo', 400, 'NO_FILE');
    }

    // Validar que el usuario tenga restauranteId
    if (!req.user?.restauranteId) {
      return this.responseUtil.error(
        res,
        'Usuario no asociado a un restaurante',
        403,
        'NO_RESTAURANT_ID'
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!this.storageService.validateFileType(req.file, allowedTypes)) {
      return this.responseUtil.error(
        res,
        'Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)',
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!this.storageService.validateFileSize(req.file, maxSize)) {
      return this.responseUtil.error(
        res,
        'El archivo es demasiado grande. El tamaño máximo es 5MB',
        400,
        'FILE_TOO_LARGE'
      );
    }

    // Obtener la subcarpeta desde el query (opcional)
    // Opciones: 'imagenes', 'items', 'categorias', 'perfil', 'portada', etc.
    const subfolder = (req.query.subfolder as string) || 'imagenes';

    try {
      const result = await this.storageService.uploadFile(
        req.file,
        req.user.restauranteId,
        subfolder,
        true
      );
      return this.responseUtil.success(res, result, 'Imagen subida exitosamente', 201);
    } catch (error: any) {
      return this.responseUtil.error(res, error.message || 'Error al subir la imagen', 500, 'UPLOAD_ERROR');
    }
  });

  /**
   * Elimina una imagen de Firebase Storage
   * Puede recibir:
   * - storagePath completo en el body: { storagePath: "MenuQR/{restaurante_id}/imagenes/{filename}" }
   * - O restauranteId, subfolder y fileName en el body
   */
  public deleteImage = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { storagePath } = req.body;
    const { restauranteId, subfolder, fileName } = req.body;

    // Validar que el usuario tenga restauranteId
    if (!req.user?.restauranteId) {
      return this.responseUtil.error(
        res,
        'Usuario no asociado a un restaurante',
        403,
        'NO_RESTAURANT_ID'
      );
    }

    // Verificar que el usuario solo pueda eliminar archivos de su restaurante
    const userRestauranteId = req.user.restauranteId;

    try {
      let pathToDelete: string;

      if (storagePath) {
        // Validar que el path pertenezca al restaurante del usuario
        if (!storagePath.includes(`MenuQR/${userRestauranteId}/`)) {
          return this.responseUtil.error(
            res,
            'No tienes permiso para eliminar este archivo',
            403,
            'UNAUTHORIZED_DELETE'
          );
        }
        pathToDelete = storagePath;
      } else if (restauranteId && subfolder && fileName) {
        // Validar que el restauranteId coincida con el del usuario
        if (restauranteId !== userRestauranteId) {
          return this.responseUtil.error(
            res,
            'No tienes permiso para eliminar archivos de otro restaurante',
            403,
            'UNAUTHORIZED_DELETE'
          );
        }
        pathToDelete = `MenuQR/${restauranteId}/${subfolder}/${fileName}`;
      } else {
        return this.responseUtil.error(
          res,
          'Debe proporcionar storagePath completo o (restauranteId, subfolder, fileName)',
          400,
          'INVALID_PARAMS'
        );
      }

      await this.storageService.deleteFile(pathToDelete);
      return this.responseUtil.success(res, null, 'Imagen eliminada exitosamente', 200);
    } catch (error: any) {
      return this.responseUtil.error(res, error.message || 'Error al eliminar la imagen', 500, 'DELETE_ERROR');
    }
  });
}

