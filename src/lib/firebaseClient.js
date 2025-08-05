
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

/**
 * ----------------------------------------------------------
 * Initializes Firebase services, avoiding duplication during
 * hot module replacement (HMR) in development.
 * ----------------------------------------------------------
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * ----------------------------------------------------------
 * Exports initialized Firebase services for use throughout
 * the application.
 * ----------------------------------------------------------
 */
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Auth only on the client-side to prevent server-side errors
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;

// Export the Firebase app instance if needed elsewhere
export { app };
