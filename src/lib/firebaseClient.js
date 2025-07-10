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
//    (añádelas en .env.local)
// ---------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY ?? "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN ?? "ranoro-jm8l0.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FB_DB_URL ?? "https://ranoro-jm8l0-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID ?? "ranoro-jm8l0",
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET ?? "ranoro-jm8l0.appspot.com", // Correct domain for Firebase Storage
  messagingSenderId: process.env.NEXT_PUBLIC_FB_SENDER_ID ?? "290934350177",
  appId: process.env.NEXT_PUBLIC_FB_APP_ID ?? "1:290934350177:web:2365c77eaca4bb0d906520",
};

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
