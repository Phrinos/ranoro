
// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import { firebaseConfig } from './firebase.config';

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Force long polling to avoid WebChannel transport errors in browser console
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const storage: FirebaseStorage = getStorage(app);

// Auth is only available client-side
export const auth: Auth | null = typeof window !== 'undefined' ? getAuth(app) : null;

export { app };
