// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

/**
 * Inicializa y devuelve la instancia de Firestore del SDK de Firebase Admin,
 * asegurando que sea un singleton.
 */
export function getAdminDb(): Firestore {
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (serviceAccountString) {
      const serviceAccount = JSON.parse(serviceAccountString);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      throw new Error('❌ Faltan credenciales de Firebase Admin en las variables de entorno.');
    }
  } catch (e) {
    console.error("Error crítico al inicializar Firebase Admin:", e);
    throw e;
  }

  return getFirestore();
}

export const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
