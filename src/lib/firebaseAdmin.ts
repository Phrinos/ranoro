
// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

let app: App | null = null;
let db: Firestore | null = null;

const initializeAdminApp = () => {
  const existingApp = getApps().find(a => a.name === 'admin-app');
  if (existingApp) {
    return existingApp;
  }
  
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY no está configurada en las variables de entorno.'
    );
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    return initializeApp({
      credential: cert(serviceAccount)
    }, 'admin-app');
  } catch (e) {
    console.error("Error al parsear o inicializar las credenciales de Firebase Admin:", e);
    throw new Error("Las credenciales de Firebase Admin no son un JSON válido.");
  }
};

/**
 * Initializes and returns the Firebase Admin SDK App instance,
 * ensuring it's a singleton.
 *
 * @returns The initialized Firebase Admin App instance.
 */
export function getAdminApp(): App {
  if (app) return app;
  app = initializeAdminApp();
  return app;
}


/**
 * Initializes and returns the Firebase Admin SDK's Firestore instance,
 * ensuring it's a singleton.
 *
 * @returns The initialized Firestore instance.
 */
export function getAdminDb(): Firestore {
  if (db) return db;
  const adminApp = getAdminApp();
  db = getFirestore(adminApp);
  return db;
}

export const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
