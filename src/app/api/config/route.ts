// lib/firebaseAdmin.ts (ejemplo)
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      // Usa GOOGLE_APPLICATION_CREDENTIALS o un JSON en env
      // credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
    });
  }
  return getFirestore();
}
