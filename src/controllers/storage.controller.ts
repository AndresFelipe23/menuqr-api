import { BaseController } from './base.controller';
import { StorageService } from '../services/storage.service';
import { AuthenticatedRequest } from '../types/express.types';

export class StorageController extends BaseController {
  private storageService = new StorageService();
  private readonly imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly pdfMimeTypes = ['application/pdf', 'application/x-pdf'];

  /**
   * Sube un archivo (imagen o PDF) a Firebase Storage
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

    // Obtener la subcarpeta desde el query (opcional)
    // Opciones: 'imagenes', 'items', 'categorias', 'perfil', 'portada', 'menus-pdf', etc.
    const rawSubfolder = (req.query.subfolder as string) || 'imagenes';
    const subfolder = rawSubfolder.trim().toLowerCase();
    const isMenuPdfFolder = subfolder === 'menus-pdf';

    // Validación estricta por subcarpeta:
    // - menus-pdf: solo PDF
    // - resto: solo imágenes
    const allowedTypes = isMenuPdfFolder ? this.pdfMimeTypes : this.imageMimeTypes;
    if (!this.storageService.validateFileType(req.file, allowedTypes)) {
      const mensaje = isMenuPdfFolder
        ? 'Para la carpeta menus-pdf solo se permiten archivos PDF'
        : 'Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)';
      return this.responseUtil.error(
        res,
        mensaje,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Validar tamaño (10MB máximo para soportar menús PDF)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!this.storageService.validateFileSize(req.file, maxSize)) {
      return this.responseUtil.error(
        res,
        'El archivo es demasiado grande. El tamaño máximo es 10MB',
        400,
        'FILE_TOO_LARGE'
      );
    }

    try {
      const result = await this.storageService.uploadFile(
        req.file,
        req.user.restauranteId,
        subfolder,
        true
      );
      const mensaje = this.pdfMimeTypes.includes(req.file.mimetype)
        ? 'PDF subido exitosamente'
        : 'Imagen subida exitosamente';
      return this.responseUtil.success(res, result, mensaje, 201);
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

  public downloadFile = this.asyncHandler(async (req: AuthenticatedRequest, res) => {
    const fileUrl = req.query.url as string | undefined;
    const fileNameQuery = req.query.filename as string | undefined;

    if (!fileUrl) {
      return this.responseUtil.error(res, 'Debe proporcionar la URL del archivo', 400, 'MISSING_URL');
    }

    if (!req.user?.restauranteId) {
      return this.responseUtil.error(
        res,
        'Usuario no asociado a un restaurante',
        403,
        'NO_RESTAURANT_ID'
      );
    }

    const userRestauranteId = req.user.restauranteId;
    const marker = '/o/';
    const markerIndex = fileUrl.indexOf(marker);
    const encodedPath = markerIndex >= 0 ? fileUrl.slice(markerIndex + marker.length).split('?')[0] : null;
    const decodedPath = encodedPath ? decodeURIComponent(encodedPath) : null;

    if (!decodedPath || !decodedPath.includes(`MenuQR/${userRestauranteId}/`)) {
      return this.responseUtil.error(
        res,
        'No tienes permiso para descargar este archivo',
        403,
        'UNAUTHORIZED_DOWNLOAD'
      );
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      return this.responseUtil.error(
        res,
        'No se pudo obtener el archivo desde storage',
        502,
        'STORAGE_FETCH_FAILED'
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());
    const fallbackName = decodedPath.split('/').pop() || 'archivo';
    const safeFileName = (fileNameQuery || fallbackName).replace(/[\r\n"]/g, '').trim() || fallbackName;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return res.status(200).send(buffer);
  });
}

