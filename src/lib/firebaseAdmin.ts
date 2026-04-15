// src/lib/firebaseAdmin.ts
import 'server-only';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

/**
 * Inicializa y devuelve la instancia de Firestore del SDK de Firebase Admin,
 * asegurando que sea un singleton. Este servicio es necesario para las 
 * herramientas de IA que se ejecutan en el servidor.
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
      // Fallback para entornos que auto-inyectan credenciales
      initializeApp();
    }
  } catch (e) {
    console.error("Error crítico al inicializar Firebase Admin:", e);
    throw e;
  }

  return getFirestore();
}

/**
 * Devuelve la instancia de Auth de Firebase Admin.
 */
export function getAdminAuth() {
  if (getApps().length === 0) {
    getAdminDb(); // inicializa si es necesario
  }
  return getAuth(getApp());
}

export const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
