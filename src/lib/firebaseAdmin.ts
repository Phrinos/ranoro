// src/lib/firebaseAdmin.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let serviceAccount: any = null;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (raw) {
  try {
    serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key?.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
  }
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var is missing.');
}

function getAdminApp() {
  try {
    return getApp('admin-app');
  } catch {
    return initializeApp({ credential: cert(serviceAccount) }, 'admin-app');
  }
}

export const getAdminDb = () => getFirestore(getAdminApp());
