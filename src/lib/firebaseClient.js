// lib/firebaseClient.js
// ---------------------------------------------------
// Inicializa Firebase de forma segura (v9 modular)
// ---------------------------------------------------
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// ---------------------------------------------------
// 1. Configuración mediante variables de entorno
//    Asegúrate de que estas variables existan en tu archivo .env.local
// ---------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FB_DB_URL,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
};

// Verificación de que las variables de entorno están cargadas
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("No se encontraron las variables de entorno de Firebase. Asegúrate de tener un archivo .env.local con la configuración correcta.");
}

// ---------------------------------------------------
// 2. Inicializa la app solo una vez
// ---------------------------------------------------
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ---------------------------------------------------
// 3. Servicios comunes (Firestore y Storage)
// ---------------------------------------------------
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth solo en cliente (evita cargar en SSR)
export const auth =
  typeof window !== "undefined" ? getAuth(app) : null;

// Exporta la app por si la necesitas en otras libs
export { app };
