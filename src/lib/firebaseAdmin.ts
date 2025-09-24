// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './firebase.config.js'; // Importar la configuración

let app: App | null = null;
let db: Firestore | null = null;

// Esta función ya no es necesaria, ya que no usaremos variables de entorno para las credenciales.
/*
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (sa.private_key?.includes('\\n')) {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }
    return sa;
  } catch {
    return null;
  }
}
*/

export function getAdminDb(): Firestore {
  if (db) return db;

  const existing = getApps().find(a => a.name === 'admin-app');
  if (existing) {
    app = existing;
  } else {
    // Usar la configuración importada directamente
    const serviceAccount = {
      projectId: firebaseConfig.projectId,
      clientEmail: `firebase-adminsdk-v1b5n@${firebaseConfig.projectId}.iam.gserviceaccount.com`, // Email de cuenta de servicio estándar
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '', // Usar variable de entorno para la clave privada por seguridad
    };
    
    if (!serviceAccount.privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set.');
    }

    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId, // Añadir projectId aquí explícitamente
    }, 'admin-app');
  }

  db = getFirestore(app!);
  return db!;
}
