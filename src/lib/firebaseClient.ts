// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

/**
 * ----------------------------------------------------------
 * Initializes Firebase services, avoiding duplication during
 * hot module replacement (HMR) in development.
 * ----------------------------------------------------------
 */
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * ----------------------------------------------------------
 * Exports initialized Firebase services for use throughout
 * the application.
 * ----------------------------------------------------------
 */
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Initialize Auth only on the client-side to prevent server-side errors
export const auth: Auth | null = typeof window !== 'undefined' ? getAuth(app) : null;

// Ensure persistence is set if auth is initialized
if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("[FIREBASE] Persistence error:", err);
  });
}

// Export the Firebase app instance if needed elsewhere
export { app };
