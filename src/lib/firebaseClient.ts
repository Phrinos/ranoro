
// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth, browserLocalPersistence, setPersistence, GoogleAuthProvider } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

export const googleProvider = new GoogleAuthProvider();

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
if (typeof window !== 'undefined' && auth) {
  console.log("[AUTH-AUDIT] Initializing client-side auth persistence...");
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("[AUTH-AUDIT] Auth persistence set to 'LOCAL' successfully.");
    })
    .catch((err) => {
      console.error("[AUTH-AUDIT] Critical error setting auth persistence:", err);
    });
} else {
  console.warn("[AUTH-AUDIT] Auth initialization skipped (possible Server Side execution).");
}

// Export the Firebase app instance if needed elsewhere
export { app };
