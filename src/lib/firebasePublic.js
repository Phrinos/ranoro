// src/lib/firebasePublic.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebase.config'; // Importar la configuración directamente

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
