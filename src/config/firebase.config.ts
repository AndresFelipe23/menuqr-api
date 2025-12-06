import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

/**
 * Configuración de Firebase Admin SDK
 */
let firebaseApp: admin.app.App | null = null;

/**
 * Inicializa Firebase Admin SDK
 */
export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Ruta al archivo de credenciales
    const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH 
      || path.join(__dirname, '../../firebase-service-account.json');

    // Verificar si el archivo existe
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Archivo de credenciales de Firebase no encontrado en: ${credentialsPath}`);
    }

    // Leer las credenciales
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    // Inicializar Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'proyectnexus-b060b.firebasestorage.app',
    });

    console.log('✅ Firebase Admin SDK inicializado correctamente');
    return firebaseApp;
  } catch (error: any) {
    console.error('❌ Error al inicializar Firebase Admin SDK:', error.message);
    throw error;
  }
}

/**
 * Obtiene la instancia de Firebase App
 */
export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

/**
 * Obtiene el bucket de Firebase Storage
 */
export function getStorageBucket(): admin.storage.Storage {
  const app = getFirebaseApp();
  return app.storage();
}

/**
 * Configuración de Firebase para el cliente (frontend)
 */
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDrzvcfymaky2rTfx7NWFnME3nB8Vu0XBs",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "proyectnexus-b060b.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "proyectnexus-b060b",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "proyectnexus-b060b.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1008927596866",
  appId: process.env.FIREBASE_APP_ID || "1:1008927596866:web:2fe5fde61922f8ec1ea8db",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-NZ4DQ2E3XC"
};

