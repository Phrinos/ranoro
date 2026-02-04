// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

let app: App | null = null;
let db: Firestore | null = null;

/**
 * Inicializa y devuelve la instancia de Firestore del SDK de Firebase Admin,
 * asegurando que sea un singleton.
 *
 * @returns La instancia de Firestore inicializada.
 */
export function getAdminDb(): Firestore {
  if (db) return db;

  const existingApp = getApps().length > 0 ? getApps()[0] : null;
  if (existingApp) {
    app = existingApp;
  } else {
    // Intentamos cargar las credenciales desde las variables de entorno
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    try {
      if (serviceAccountString) {
        // Opción 1: JSON completo en una sola variable
        const serviceAccount = JSON.parse(serviceAccountString);
        app = initializeApp({
          credential: cert(serviceAccount)
        });
      } else if (projectId && clientEmail && privateKey) {
        // Opción 2: Variables individuales
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        throw new Error(
          'No se encontraron credenciales de Firebase Admin (.env ignorado o incompleto).'
        );
      }
    } catch (e) {
      console.error("Error al inicializar Firebase Admin:", e);
      throw e;
    }
  }

  db = getFirestore(app!);
  return db;
}

export const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
