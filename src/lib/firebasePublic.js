// src/lib/firebasePublic.js
// Cliente de Firebase MÍNIMO solo para acceso público a la base de datos.
// NO inicializa la autenticación para evitar redirecciones de login.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️  Este cliente es “público” (solo lectura).  
// Si te preocupa exponer la API Key, usa .env en lugar de texto plano.

const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro-jm8l0.firebaseapp.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.appspot.com",      // ← corregido
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520",
  // databaseURL no es necesario para Firestore; sólo para Realtime DB
};

let db = null;
const PUBLIC_APP_NAME = "firebase-public-app";

/**
 * Inicializa (o regresa si ya existe) una app secundaria
 * destinada a páginas públicas. Solo activa Firestore,
 * sin Auth ni otros servicios.
 */
function initializePublicApp() {
  const existing = getApps().find(app => app.name === PUBLIC_APP_NAME);
  return existing ?? initializeApp(firebaseConfig, PUBLIC_APP_NAME);
}

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("TU_")) {
  const publicApp = initializePublicApp();
  db = getFirestore(publicApp);
} else if (typeof window !== "undefined") {
  console.warn(
    "MODO DEMO: Conexión a base pública no disponible sin credenciales."
  );
}

// Exporta solo la instancia de Firestore
export { db };
