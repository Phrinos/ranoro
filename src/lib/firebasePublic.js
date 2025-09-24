
// src/lib/firebasePublic.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initializes and returns the "public" Firebase app instance,
 * ensuring it's created only once.
 * @returns The Firebase App instance.
 */
function initializePublicApp() {
    const publicAppName = "public";
    // Find an existing app with the name "public"
    const existingApp = getApps().find(app => app.name === publicAppName);
    
    // If it already exists, return it
    if (existingApp) {
        return existingApp;
    }
    
    // Otherwise, create and return the new app
    return initializeApp(firebaseConfig, publicAppName);
}

// Initialize the app using the robust function
const app = initializePublicApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
