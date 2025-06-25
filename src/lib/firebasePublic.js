// src/lib/firebasePublic.js
// Cliente de Firebase MÍNIMO solo para acceso público a la base de datos.
// NO inicializa la autenticación para evitar redirecciones de login.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Se usa la misma configuración que el cliente principal
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_AUTH_DOMAIN_AQUI",
  projectId: "TU_PROJECT_ID_AQUI",
  storageBucket: "TU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
  appId: "TU_APP_ID_AQUI",
};

let db = null;
const PUBLIC_APP_NAME = "firebase-public-app";

/**
 * Initializes and returns a named, secondary Firebase app instance
 * specifically for public-facing pages. This avoids initializing
 * auth services and prevents unwanted redirects to login.
 * @returns The public Firebase app instance.
 */
function initializePublicApp() {
  const apps = getApps();
  const existingApp = apps.find(app => app.name === PUBLIC_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  return initializeApp(firebaseConfig, PUBLIC_APP_NAME);
}


if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("TU_")) {
  // Inicializa la app pública, pero no los otros servicios de Firebase
  const publicApp = initializePublicApp();
  db = getFirestore(publicApp);
} else {
  if (typeof window !== 'undefined') {
    console.warn("MODO DEMO: Conexión a base de datos pública no disponible sin credenciales de Firebase.");
  }
}

// Exporta solo la instancia de la base de datos
export { db };
