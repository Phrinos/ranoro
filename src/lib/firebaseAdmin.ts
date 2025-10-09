// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | null = null;
let db: Firestore | null = null;

/**
 * Initializes and returns the Firebase Admin SDK's Firestore instance,
 * ensuring it's a singleton. It uses service account credentials
 * from environment variables, making it suitable for serverless environments.
 *
 * @returns The initialized Firestore instance.
 * @throws {Error} If the service account key is not found in environment variables.
 */
export function getAdminDb(): Firestore {
  // Return the cached instance if it already exists.
  if (db) return db;

  // Find an existing app instance to prevent re-initialization errors.
  const existingApp = getApps().find(a => a.name === 'admin-app');
  if (existingApp) {
    app = existingApp;
  } else {
    // Retrieve the service account key from environment variables.
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY no está configurada en las variables de entorno.'
      );
    }
    
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      app = initializeApp({
        credential: cert(serviceAccount)
      }, 'admin-app');
    } catch (e) {
      console.error("Error al parsear o inicializar las credenciales de Firebase Admin:", e);
      throw new Error("Las credenciales de Firebase Admin no son un JSON válido.");
    }
  }

  // Get the Firestore instance from the app and cache it.
  db = getFirestore(app!);
  return db;
}
