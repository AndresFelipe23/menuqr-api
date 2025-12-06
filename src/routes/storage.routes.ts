import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadSingle } from '../middlewares/upload.middleware';

const router = Router();
const storageController = new StorageController();

/**
 * @route POST /api/storage/upload
 * @desc Subir una imagen a Firebase Storage
 * @access Private
 * @query subfolder - Subcarpeta dentro de MenuQR/{restaurante_id}/ (opcional, default: 'imagenes')
 *                     Opciones: 'imagenes', 'items', 'categorias', 'perfil', 'portada'
 */
router.post(
  '/upload',
  authenticate,
  uploadSingle('image'),
  storageController.uploadImage.bind(storageController)
);

/**
 * @route DELETE /api/storage
 * @desc Eliminar una imagen de Firebase Storage
 * @access Private
 * @body { storagePath: string } o { restauranteId: string, subfolder: string, fileName: string }
 */
router.delete(
  '/',
  authenticate,
  storageController.deleteImage.bind(storageController)
);

export default router;

