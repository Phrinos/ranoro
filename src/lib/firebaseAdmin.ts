// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | null = null;
let db: Firestore | null = null;

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

export function getAdminDb(): Firestore {
  if (db) return db;

  // Reusa si ya existe
  const existing = getApps().find(a => a.name === 'admin-app');
  if (existing) {
    app = existing;
  } else {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      // Lanza aquí (dentro de la función), para que el route lo pueda atrapar
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid.');
    }
    app = initializeApp({ credential: cert(serviceAccount) }, 'admin-app');
  }

  db = getFirestore(app!);
  return db!;
}
