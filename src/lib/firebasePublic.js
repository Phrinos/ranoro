// src/lib/firebasePublic.js
// Cliente de Firebase MÍNIMO solo para acceso público a la base de datos.
// NO inicializa la autenticación para evitar redirecciones de login.

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro-jm8l0.firebaseapp.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.appspot.com",
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520",
};

let db = null;
const PUBLIC_APP_NAME = "firebase-public-app";

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg_REPLACE_ME") {
  try {
    // Intenta obtener la app pública si ya existe
    const publicApp = getApp(PUBLIC_APP_NAME);
    db = getFirestore(publicApp);
  } catch(e) {
    // Si no existe, inicialízala
    const publicApp = initializeApp(firebaseConfig, PUBLIC_APP_NAME);
    db = getFirestore(publicApp);
  }
} else if (typeof window !== "undefined") {
  console.warn(
    "MODO DEMO: Conexión a base pública no disponible sin credenciales."
  );
}

// Exporta solo la instancia de Firestore
export { db };
