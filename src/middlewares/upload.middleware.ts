import multer from 'multer';
import { Request } from 'express';

// Configurar multer para almacenar en memoria (buffer)
const storage = multer.memoryStorage();

// Filtro de tipos de archivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos MIME permitidos para imágenes
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
  }
};

// Configurar multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

// Middleware para subir una sola imagen
export const uploadSingle = (fieldName: string = 'image') => {
  return upload.single(fieldName);
};

// Middleware para subir múltiples imágenes
export const uploadMultiple = (fieldName: string = 'images', maxCount: number = 10) => {
  return upload.array(fieldName, maxCount);
};

