import { randomUUID } from 'crypto';
import path from 'path';
import { BaseService } from './base.service';
import { LogCategory } from '../utils/logger';
import { getStorageBucket } from '../config/firebase.config';

export interface UploadResult {
  url: string;
  fileName: string;
  bucket: string;
  path: string; // Ruta completa en Firebase Storage
}

export class StorageService extends BaseService {
  protected logCategory = LogCategory.SISTEMA;
  private storage: ReturnType<typeof getStorageBucket>;
  private bucketName: string;

  constructor() {
    super();
    // Inicializar Firebase Storage
    this.storage = getStorageBucket();
    this.bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'proyectnexus-b060b.firebasestorage.app';
  }

  /**
   * Sube un archivo a Firebase Storage
   * @param file Archivo a subir
   * @param restauranteId ID del restaurante (obligatorio para estructura MenuQR/{restaurante_id}/)
   * @param subfolder Subcarpeta dentro de la carpeta del restaurante (ej: 'items', 'categorias', 'perfil')
   * @param makePublic Si el archivo debe ser público (default: true)
   */
  async uploadFile(
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    restauranteId: string,
    subfolder: string = 'imagenes',
    makePublic: boolean = true
  ): Promise<UploadResult> {
    this.logOperation(`subir archivo: ${file.originalname}`, { 
      restauranteId, 
      subfolder, 
      size: file.size 
    });

    if (!restauranteId) {
      throw new Error('restauranteId es requerido para subir archivos');
    }

    try {
      // Generar nombre único para el archivo
      const fileExtension = path.extname(file.originalname);
      const fileName = `${randomUUID()}${fileExtension}`;
      
      // Estructura: MenuQR/{restaurante_id}/{subfolder}/{filename}
      const storagePath = `MenuQR/${restauranteId}/${subfolder}/${fileName}`;

      const bucket = this.storage.bucket(this.bucketName);
      const fileUpload = bucket.file(storagePath);

      // Subir el archivo
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000', // Cache por 1 año
        },
      });

      // Hacer el archivo público si se solicita
      if (makePublic) {
        await fileUpload.makePublic();
      }

      // Obtener la URL pública de Firebase Storage
      // Firebase Storage usa un formato diferente de URL
      const url = makePublic
        ? `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`
        : await fileUpload.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // URL válida por mucho tiempo
          }).then(urls => urls[0]);

      this.logger.info('Archivo subido exitosamente a Firebase Storage', {
        categoria: this.logCategory,
        detalle: {
          fileName,
          storagePath,
          url,
          size: file.size,
          contentType: file.mimetype,
          restauranteId,
        },
      });

      return {
        url,
        fileName,
        bucket: this.bucketName,
        path: storagePath,
      };
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error al subir archivo a Firebase Storage', errorObj, {
        categoria: this.logCategory,
        detalle: {
          fileName: file.originalname,
          restauranteId,
          subfolder,
        },
      });
      this.handleError('Error al subir el archivo a Firebase Storage', error, 500);
      throw error;
    }
  }

  /**
   * Elimina un archivo de Firebase Storage
   * @param storagePath Ruta completa del archivo en Firebase Storage (ej: MenuQR/{restaurante_id}/imagenes/{filename})
   */
  async deleteFile(storagePath: string): Promise<void> {
    this.logOperation(`eliminar archivo: ${storagePath}`);

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(storagePath);

      const [exists] = await file.exists();
      if (!exists) {
        this.logger.warn('Archivo no encontrado para eliminar', {
          categoria: this.logCategory,
          detalle: { storagePath },
        });
        return;
      }

      await file.delete();

      this.logger.info('Archivo eliminado exitosamente de Firebase Storage', {
        categoria: this.logCategory,
        detalle: { storagePath },
      });
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error al eliminar archivo de Firebase Storage', errorObj, {
        categoria: this.logCategory,
        detalle: {
          storagePath,
        },
      });
      this.handleError('Error al eliminar el archivo de Firebase Storage', error, 500);
      throw error;
    }
  }

  /**
   * Elimina un archivo usando solo el nombre del archivo y restauranteId
   * Útil cuando solo se tiene el fileName guardado en BD
   */
  async deleteFileByPath(
    restauranteId: string,
    subfolder: string,
    fileName: string
  ): Promise<void> {
    const storagePath = `MenuQR/${restauranteId}/${subfolder}/${fileName}`;
    return this.deleteFile(storagePath);
  }

  /**
   * Obtiene la URL pública de un archivo en Firebase Storage
   * @param storagePath Ruta completa del archivo (ej: MenuQR/{restaurante_id}/imagenes/{filename})
   */
  getPublicUrl(storagePath: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  /**
   * Obtiene la URL pública construyendo la ruta desde componentes
   */
  getPublicUrlFromComponents(
    restauranteId: string,
    subfolder: string,
    fileName: string
  ): string {
    const storagePath = `MenuQR/${restauranteId}/${subfolder}/${fileName}`;
    return this.getPublicUrl(storagePath);
  }

  /**
   * Valida el tipo de archivo
   */
  validateFileType(file: { mimetype: string }, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Valida el tamaño del archivo (en bytes)
   */
  validateFileSize(file: { size: number }, maxSize: number): boolean {
    return file.size <= maxSize;
  }
}

