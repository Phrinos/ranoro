// src/lib/firebasePublic.js
// Cliente de Firebase MÍNIMO solo para acceso público a la base de datos.
// NO inicializa la autenticación para evitar redirecciones de login.

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro-jm8l0.firebaseapp.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.firebasestorage.app",
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520",
};

let app;
let db = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg_REPLACE_ME") {
  // Evita reinicializar en el entorno de desarrollo de Next.js
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
} else if (typeof window !== "undefined") {
  console.warn(
    "MODO DEMO: Conexión a base pública no disponible sin credenciales."
  );
}

// Exporta solo la instancia de Firestore
export { db };
