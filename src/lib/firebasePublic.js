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

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("TU_")) {
  // Inicializa la app, pero no los otros servicios
  const app = !getApps().length ? initializeApp(firebaseConfig, "firebase-public-app") : getApps().find(app => app.name === "firebase-public-app") || getApps()[0];
  db = getFirestore(app);
} else {
  if (typeof window !== 'undefined') {
    console.warn("MODO DEMO: Conexión a base de datos pública no disponible sin credenciales de Firebase.");
  }
}

// Exporta solo la instancia de la base de datos
export { db };
